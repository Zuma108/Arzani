"use client";

import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

interface AuraGraphProps {
  data: {
    subject: string;
    Aura: number;
    GoldStandard: number;
    fullMark: number;
  }[];
}

export default function AuraGraph({ data }: AuraGraphProps) {
  return (
    <div className="w-full h-64 sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar
            name="Gold Standard"
            dataKey="GoldStandard"
            stroke="#8a2be2"
            fill="#8a2be2"
            fillOpacity={0.3}
          />
          <Radar
            name="Your Aura"
            dataKey="Aura"
            stroke="#00f0ff"
            fill="#00f0ff"
            fillOpacity={0.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
