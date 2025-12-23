/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

const API_BASE_URL =
  "https://mashboard-api.despreadlabs.io/storyteller-leaderboard";
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DB_ID = process.env.NOTION_STORYTELLER_DB_ID;

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// [New] 수집할 기간 목록 정의
const LOOKBACK_DAYS = [7, 14, 30, 90];

export async function GET(request: Request) {
  console.log("--> [Cron] Data Source Job Started (Multi-Duration)");

  // 1. 보안 체크
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if (!NOTION_TOKEN || !DB_ID) {
    return NextResponse.json({ error: "Env missing" }, { status: 500 });
  }

  // [날짜 설정] UTC 15:00 실행 시 -> 한국은 다음날 00:00
  // new Date()는 UTC 기준이므로 '어제 날짜(마감된 날짜)'로 찍힙니다.
  // 예: 한국 26일 00시 실행 -> 파일명: 2025-XX-25.json (25일자 마감 데이터라는 의미로 적절함)
  const today = new Date().toISOString().split("T")[0];

  const headers = {
    Authorization: `Bearer ${NOTION_TOKEN}`,
    "Content-Type": "application/json",
    "Notion-Version": "2025-09-03",
  };

  try {
    // ---------------------------------------------------------
    // 1. DB 메타데이터 및 Notion Page 조회
    // ---------------------------------------------------------
    const dbRes = await fetch(`https://api.notion.com/v1/databases/${DB_ID}`, {
      headers,
    });
    if (!dbRes.ok) throw new Error(`DB Metadata Error: ${dbRes.statusText}`);

    const dbData = await dbRes.json();
    const dataSources = dbData.data_sources || [];
    const allPages: any[] = [];

    if (dataSources.length > 0) {
      await Promise.all(
        dataSources.map(async (source: any) => {
          const queryRes = await fetch(
            `https://api.notion.com/v1/data_sources/${source.id}/query`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({}),
            }
          );
          if (queryRes.ok) {
            const data = await queryRes.json();
            allPages.push(...(data.results || []));
          }
        })
      );
    } else {
      // 데이터 소스가 없는 경우 레거시 방식 조회 (필요 시)
      const legacyRes = await fetch(
        `https://api.notion.com/v1/databases/${DB_ID}/query`,
        { method: "POST", headers, body: JSON.stringify({}) }
      );
      if (legacyRes.ok)
        allPages.push(...((await legacyRes.json()).results || []));
    }

    // ---------------------------------------------------------
    // 2. 대상 프로젝트 필터링 (GroupID 존재 여부)
    // ---------------------------------------------------------
    const targetProjects = allPages.filter((page: any) => {
      const props = page.properties;
      const groupProp =
        props["GroupID"] || props["Group ID"] || props["그룹ID"];
      if (groupProp?.number) return true;
      if (groupProp?.rich_text?.[0]?.plain_text) return true;
      if (groupProp?.title?.[0]?.plain_text) return true;
      return false;
    });

    console.log(`--> Target Projects: ${targetProjects.length}`);

    // ---------------------------------------------------------
    // 3. 데이터 수집 및 저장 (Multi-Duration)
    // ---------------------------------------------------------
    const results = [];

    for (const page of targetProjects) {
      const props = page.properties;
      const groupProp =
        props["GroupID"] || props["Group ID"] || props["그룹ID"];

      let groupId = null;
      if (groupProp?.number) groupId = String(groupProp.number);
      else if (groupProp?.rich_text)
        groupId = groupProp.rich_text[0]?.plain_text;
      else if (groupProp?.title) groupId = groupProp.title[0]?.plain_text;

      if (groupId) {
        try {
          // [핵심 변경] 7, 14, 30, 90일 데이터를 병렬로 모두 가져옴
          const collectedData: Record<string, any> = {};

          await Promise.all(
            LOOKBACK_DAYS.map(async (days) => {
              // 50개 데이터 기준
              const apiUrl = `${API_BASE_URL}/${groupId}/timeseries-group?limit=50&lookbacks=${days}`;
              const res = await fetch(apiUrl);
              if (res.ok) {
                collectedData[String(days)] = await res.json();
              }
            })
          );

          // 데이터가 하나라도 수집되었다면 저장
          if (Object.keys(collectedData).length > 0) {
            const filename = `history/${groupId}/${today}.json`;

            // 하나의 JSON 파일 안에 {"7":..., "14":..., "30":..., "90":...} 형태로 저장됨
            const blob = await put(filename, JSON.stringify(collectedData), {
              access: "public",
              contentType: "application/json",
              addRandomSuffix: false,
              allowOverwrite: true, // 덮어쓰기 허용
            });

            console.log(
              `   Saved: ${filename} (Keys: ${Object.keys(collectedData).join(
                ", "
              )})`
            );
            results.push({ groupId, url: blob.url });
          }
        } catch (e) {
          console.error(`   Error Group ${groupId}:`, e);
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: results.length,
      saved: results,
    });
  } catch (error) {
    console.error("Critical Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
