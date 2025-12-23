"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

// 데이터 타입 정의
export interface ProjectCard {
  id: string;
  title: string;
  icon: string | null;
  team: string;
  status: string; // "진행 중" | "종료"
  progress: number;
  period: string;
  periodStart: string;
  manager: string;
  managerImage: string | null;
  // [수정] PoC 프로필 이미지를 위한 필드 추가
  poc: string; // Point of Contact
  pocImage: string | null;
  workScope: string[];
  reportStatus?: string; // "Approved" | "Pending" | "Issue" | "N/A"
  apiProjectId?: string;
}

export interface AutomationItem {
  id: string;
  title: string;
  status: string;
  description: string;
  notionUrl: string;
  techStack?: string[];
  category: string;
  icon: string | null;
}

interface DashboardClientProps {
  projects: ProjectCard[];
  automations?: AutomationItem[];
  title: string;
  isOverview?: boolean;
}

type SortKey = "team" | "periodStart" | "manager";
type SortOrder = "asc" | "desc";

export default function DashboardClient({
  projects,
  automations = [],
  title,
  isOverview = false,
}: DashboardClientProps) {
  const [filter, setFilter] = useState("active");
  const [sortKey, setSortKey] = useState<SortKey>("team");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [selectedProcess, setSelectedProcess] = useState<AutomationItem | null>(
    null
  );

  // 자동화 항목 그룹화
  const groupedAutomations = useMemo(() => {
    const groups: Record<string, AutomationItem[]> = {};
    automations.forEach((item) => {
      const cat = item.category || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [automations]);

  // 프로젝트 필터링 및 정렬
  const processedProjects = useMemo(() => {
    let temp = projects.filter((p) => {
      if (filter === "all") return true;
      if (filter === "active") return p.status === "진행 중";
      if (filter === "done") return p.status !== "진행 중";
      return true;
    });

    temp = temp.sort((a, b) => {
      const valA = a[sortKey] || "";
      const valB = b[sortKey] || "";
      const comparison = String(valA).localeCompare(String(valB));
      return sortOrder === "asc" ? comparison : -comparison;
    });

    if (isOverview) return temp.slice(0, 4);
    return temp;
  }, [projects, filter, sortKey, sortOrder, isOverview]);

  return (
    // [유지] 배경색을 흰색(bg-white)으로 통일 (layout.tsx와 일치)
    <div className="flex-1 w-full bg-[#F5F5F7] text-[#1D1D1F] font-sans">
      {/* 컨텐츠 래퍼 */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* 헤더 섹션 */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6">
          <div>
            <h1
              className="text-[#0037F0] text-4xl font-black uppercase tracking-tighter mb-2 leading-[0.9]"
              style={{ fontFamily: "'General Sans', sans-serif" }}
            >
              {isOverview ? "Overview" : title}
            </h1>
            <p className="text-gray-500 text-sm font-medium ml-1">
              {isOverview
                ? "주요 프로젝트 및 자동화 프로세스 요약"
                : "전체 프로젝트 현황 모니터링"}
            </p>
          </div>

          {!isOverview && (
            <div className="flex flex-wrap items-center gap-3">
              {/* [수정] Sort Control: 오름차순/내림차순 표시 추가 */}
              <div className="flex items-center bg-white rounded-lg px-3 py-1.5 border border-gray-200 shadow-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-3">
                  Sort
                </span>
                <div className="flex gap-3">
                  {[
                    { key: "team", label: "Team" },
                    { key: "periodStart", label: "Date" },
                    { key: "manager", label: "Manager" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => {
                        if (sortKey === opt.key) {
                          setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                        } else {
                          setSortKey(opt.key as SortKey);
                          setSortOrder("asc");
                        }
                      }}
                      className={`text-xs transition-colors flex items-center gap-1 ${
                        sortKey === opt.key
                          ? "text-black font-bold"
                          : "text-gray-400 hover:text-gray-800 font-medium"
                      }`}
                    >
                      {opt.label}
                      {/* [추가] 정렬 방향 인디케이터 (▲/▼) */}
                      {sortKey === opt.key && (
                        <span className="text-[8px] text-[#0037F0]">
                          {sortOrder === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="bg-white border border-gray-200 p-1 rounded-lg inline-flex shadow-sm">
                {[
                  { key: "all", label: "All" },
                  { key: "active", label: "Active" },
                  { key: "done", label: "Done" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all duration-200 ${
                      filter === tab.key
                        ? "bg-[#F5F5F7] text-black shadow-inner"
                        : "text-gray-400 hover:text-gray-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 프로젝트 그리드 */}
        <section className="mb-16">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              📂 Active Projects
            </h2>
            {isOverview && (
              <Link
                href="/projects"
                className="text-xs font-bold text-gray-400 hover:text-black transition-colors"
              >
                VIEW ALL →
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {processedProjects.map((project) => (
              <div
                key={project.id}
                className="group relative bg-white rounded-xl border border-gray-200 
                  transition-all duration-300 
                  hover:border-[#0037F0] hover:shadow-xl hover:-translate-y-1 
                  flex flex-col overflow-visible"
              >
                {/* 카드 상단: 팀 뱃지 & 리포트 상태 */}
                <div className="px-5 py-4 flex justify-between items-start">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                      project.team.includes("1팀")
                        ? "bg-red-50 text-red-600"
                        : project.team.includes("2팀")
                        ? "bg-orange-50 text-orange-600"
                        : project.team.includes("3팀")
                        ? "bg-purple-50 text-purple-600"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {project.team}
                  </span>

                  {/* 리포트 상태 툴팁 */}
                  {project.reportStatus && project.reportStatus !== "N/A" && (
                    <div className="relative group/tooltip z-20 cursor-help">
                      <div
                        className={`w-2.5 h-2.5 rounded-full border border-white shadow-sm transition-transform hover:scale-125 ${
                          project.reportStatus === "Approved"
                            ? "bg-green-500"
                            : project.reportStatus === "Pending"
                            ? "bg-yellow-400"
                            : "bg-red-500"
                        }`}
                      />
                      <div className="absolute right-0 top-5 w-max min-w-[120px] bg-gray-900/95 backdrop-blur text-white text-[10px] p-3 rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-all duration-200 pointer-events-none shadow-xl translate-y-2 group-hover/tooltip:translate-y-0 z-50">
                        <p className="font-bold text-gray-400 mb-2 uppercase text-[9px] tracking-wider">
                          Report Status
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span>Approved (완료)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                            <span>Pending (대기)</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span>Issue (확인 필요)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 메인 컨텐츠 */}
                <div className="px-5 pb-3 flex-1">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 flex items-center justify-center text-xl bg-gray-50 rounded-lg border border-gray-100 shrink-0 group-hover:bg-blue-50/50 transition-colors">
                      {project.icon && !project.icon.startsWith("http") ? (
                        project.icon
                      ) : project.icon ? (
                        <img
                          src={project.icon}
                          alt="icon"
                          className="w-5 h-5 object-contain"
                        />
                      ) : (
                        "📄"
                      )}
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <h3 className="text-base font-bold text-gray-900 leading-tight truncate group-hover:text-[#0037F0] transition-colors">
                        {project.title}
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-1 font-medium font-mono">
                        {project.period}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 pt-3 border-t border-dashed border-gray-100 space-y-2">
                    {/* Manager Row */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-medium">Manager</span>
                      <div className="flex items-center gap-1.5">
                        {project.managerImage ? (
                          <img
                            src={project.managerImage}
                            alt={project.manager}
                            className="w-4 h-4 rounded-full border border-gray-100 object-cover"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-500">
                            {project.manager.slice(0, 1)}
                          </div>
                        )}
                        <span className="font-semibold text-gray-700">
                          {project.manager}
                        </span>
                      </div>
                    </div>

                    {/* [수정] PoC Row에도 프로필 이미지 적용 */}
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-400 font-medium">PoC</span>
                      <div className="flex items-center gap-1.5">
                        {project.pocImage ? (
                          <img
                            src={project.pocImage}
                            alt={project.poc}
                            className="w-4 h-4 rounded-full border border-gray-100 object-cover"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-[8px] font-bold text-gray-500">
                            {/* 이름이 없으면 '-' 표시 */}
                            {project.poc ? project.poc.slice(0, 1) : "-"}
                          </div>
                        )}
                        <span className="font-semibold text-gray-700">
                          {project.poc || "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Work Scope 태그 */}
                  <div className="flex flex-wrap gap-1.5 min-h-[24px]">
                    {project.workScope.map((scope, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 bg-gray-50 text-gray-500 text-[10px] font-medium rounded border border-gray-100"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 하단 정보 */}
                <div className="px-5 py-3 mt-2 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between gap-4">
                  <span
                    className={`shrink-0 px-2 py-0.5 text-[10px] font-bold rounded border ${
                      project.status === "진행 중"
                        ? "bg-blue-50 text-[#0037F0] border-blue-100"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}
                  >
                    {project.status}
                  </span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          project.progress === 100
                            ? "bg-green-500"
                            : "bg-[#0037F0]"
                        }`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-gray-500 w-6 text-right">
                      {project.progress}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {isOverview && (
          // 배경 흰색 + 보더만 사용 (그림자 X)
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  ></path>
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">
                Automation Status
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {Object.entries(groupedAutomations).map(([category, items]) => (
                <div key={category}>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {items.map((item) => (
                      <ProcessItem
                        key={item.id}
                        data={item}
                        onClick={() => setSelectedProcess(item)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* 모달 팝업 */}
      {selectedProcess && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedProcess(null)}
          ></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-[fadeIn_0.2s_ease-out]">
            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-bold text-lg text-gray-900">
                {selectedProcess.title}
              </h3>
              <button
                onClick={() => setSelectedProcess(null)}
                className="text-gray-400 hover:text-black"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <span
                className={`inline-block px-2 py-1 text-[10px] font-bold rounded mb-4 ${
                  selectedProcess.status === "AUTO"
                    ? "bg-blue-50 text-[#0037F0]"
                    : "bg-orange-50 text-orange-600"
                }`}
              >
                {selectedProcess.status}
              </span>
              <p className="text-gray-600 text-sm mb-6 whitespace-pre-line leading-relaxed">
                {selectedProcess.description}
              </p>
              {selectedProcess.techStack &&
                selectedProcess.techStack.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase mb-2">
                      Stack
                    </h4>
                    <div className="flex gap-2 flex-wrap">
                      {selectedProcess.techStack.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs font-medium text-gray-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              <a
                href={selectedProcess.notionUrl}
                target="_blank"
                className="block w-full bg-[#0037F0] hover:bg-blue-700 text-white text-center py-3 rounded-lg text-sm font-bold transition-colors"
              >
                View Guide
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProcessItem({
  data,
  onClick,
}: {
  data: AutomationItem;
  onClick: () => void;
}) {
  const { title, status, icon } = data;
  const isAuto = status === "AUTO";

  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-3 p-3 rounded-lg border border-transparent hover:bg-white hover:border-gray-200 transition-all cursor-pointer bg-gray-50"
    >
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 border
         ${
           isAuto
             ? "bg-white text-[#0037F0] border-gray-100"
             : "bg-white text-orange-500 border-gray-100"
         }
        `}
      >
        {icon && !icon.startsWith("http") ? (
          <span>{icon}</span>
        ) : icon ? (
          <img src={icon} alt="" className="w-4 h-4 object-contain" />
        ) : (
          "⚡"
        )}
      </div>
      <div className="flex-1 min-w-0 flex justify-between items-center">
        <span className="font-semibold text-sm text-gray-700 group-hover:text-black truncate">
          {title}
        </span>
        <span
          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ml-2 ${
            isAuto
              ? "bg-blue-100 text-blue-700"
              : "bg-orange-100 text-orange-700"
          }`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}
