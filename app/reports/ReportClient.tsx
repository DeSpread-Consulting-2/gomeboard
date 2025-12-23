"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

export interface ReportTableRow {
  id: string;
  projectName: string;
  manager: string;
  managerImg: string | null;
  team: string;
  targetMonth: string;
  status: string;
  details: string;
}

export default function ReportClient({
  targetMonth,
  rows,
}: {
  targetMonth: string;
  rows: ReportTableRow[];
}) {
  const { user, authenticated } = usePrivy();

  return (
    <div className="flex-1 w-full bg-[#F5F5F7] text-[#1D1D1F] font-sans">
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1
            className="text-[#0037F0] text-4xl font-black uppercase tracking-tighter mb-2 leading-[0.9]"
            style={{ fontFamily: "'General Sans', sans-serif" }}
          >
            Monthly Reports
          </h1>
          <p className="text-gray-500 text-sm font-medium ml-1">
            Target Period:{" "}
            <span className="text-black font-bold">{targetMonth}</span> (Last
            Month)
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Project</th>
                <th className="px-6 py-4">Manager</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Items Approved</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-blue-50/30 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 text-sm group-hover:text-[#0037F0] transition-colors">
                        {row.projectName}
                      </span>
                      <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide mt-0.5">
                        {row.team}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {row.managerImg ? (
                        <img
                          src={row.managerImg}
                          alt=""
                          className="w-6 h-6 rounded-full border border-gray-200 object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                          {row.manager.slice(0, 1)}
                        </div>
                      )}
                      <span className="text-sm font-semibold text-gray-700">
                        {row.manager}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded text-[10px] font-bold border uppercase tracking-wide ${
                        row.status === "Approved"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : row.status === "Pending"
                          ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                          : row.status === "Missing"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-gray-100 text-gray-500 border-gray-200"
                      }`}
                    >
                      {row.status === "Approved" && "Done"}
                      {row.status === "Pending" && "Pending"}
                      {row.status === "Missing" && "Missing"}
                      {row.status === "N/A" && "-"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-xs font-medium text-gray-500">
                    {row.details || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
