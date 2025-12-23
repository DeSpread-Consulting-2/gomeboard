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

  // [날짜 설정 수정] KST 기준 "어제" 날짜를 파일명으로 사용
  // UTC 15:00 실행(한국 00:00) -> 한국 기준 어제 날짜로 저장해야 함
  // 예: 한국 26일 00시 실행 -> 25일자 데이터로 저장

  // 1. 한국 시간 기준 현재 날짜(YYYY-MM-DD) 구하기
  const kstTodayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  // 2. Date 객체로 변환 후 하루 빼기
  const targetDate = new Date(kstTodayStr);
  targetDate.setDate(targetDate.getDate() - 1);
  const today = targetDate.toISOString().split("T")[0]; // 최종 파일명 (YYYY-MM-DD)

  console.log(`--> Saving data for date: ${today} (KST Yesterday)`);

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
          const collectedData: Record<string, any> = {};

          await Promise.all(
            LOOKBACK_DAYS.map(async (days) => {
              const apiUrl = `${API_BASE_URL}/${groupId}/timeseries-group?limit=50&lookbacks=${days}`;
              const res = await fetch(apiUrl);
              if (res.ok) {
                collectedData[String(days)] = await res.json();
              }
            })
          );

          if (Object.keys(collectedData).length > 0) {
            const filename = `history/${groupId}/${today}.json`;

            const blob = await put(filename, JSON.stringify(collectedData), {
              access: "public",
              contentType: "application/json",
              addRandomSuffix: false,
              allowOverwrite: true,
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
