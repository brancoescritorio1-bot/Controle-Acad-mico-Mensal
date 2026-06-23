import React from 'react';

export const WorkRoster = ({ escala }: { escala: any }) => {
  return (
    <div className="p-8 bg-white" id="roster-print-area">
      <h1 className="text-2xl font-bold mb-6">Escala de Trabalho - {escala.name}</h1>
      
      {/* Calendar Grid Mockup */}
      <div className="grid grid-cols-[auto,repeat(30,1fr)] gap-0.5 border border-gray-200 mb-8">
        <div className="p-2 font-bold bg-gray-50 border-b">EQUIPE</div>
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="p-2 text-center text-xs border-b">{i + 1}</div>
        ))}
        {['A', 'B', 'C', 'D'].map(team => (
          <React.Fragment key={team}>
            <div className="p-2 font-bold bg-gray-100">{team}</div>
            {Array.from({ length: 30 }).map((_, i) => (
              <div key={i} className={cn("p-2 text-center text-xs border-r", i % 7 === 0 ? "bg-red-50" : "bg-white")}>
                {team}
              </div>
            ))}
          </React.Fragment>
        ))}
      </div>

      {/* Team Composition Cards */}
      <div className="grid grid-cols-4 gap-4">
        {['A', 'B', 'C', 'D'].map(team => (
          <div key={team} className="border rounded-lg p-4">
            <h3 className="font-bold mb-2">Equipe {team}</h3>
            <p className="text-sm">Membros da equipe {team}...</p>
          </div>
        ))}
      </div>
    </div>
  );
};

import { cn } from '../lib/utils';
