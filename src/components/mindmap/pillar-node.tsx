"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Plus } from "lucide-react";

export interface PillarNodeData {
  id: string;
  name: string;
  description?: string | null;
  color: string;
  ideaCount: number;
  onAddIdea: (pillarId: string) => void;
  onEdit: (pillarId: string) => void;
}

function PillarNodeComponent({ data }: { data: PillarNodeData }) {
  return (
    <div
      className="relative flex flex-col items-center justify-center rounded-full shadow-lg cursor-pointer select-none"
      style={{
        width: 140,
        height: 140,
        backgroundColor: data.color,
        border: `3px solid ${data.color}`,
      }}
      onClick={() => data.onEdit(data.id)}
      title="Click to edit pillar"
    >
      <p className="text-center text-sm font-bold text-white px-3 leading-tight">
        {data.name}
      </p>
      {data.description && (
        <p className="text-center text-[10px] text-white/70 px-3 mt-0.5 leading-tight line-clamp-2">
          {data.description}
        </p>
      )}
      <p className="text-[10px] text-white/60 mt-1">
        {data.ideaCount} idea{data.ideaCount !== 1 ? "s" : ""}
      </p>

      {/* Add idea button */}
      <button
        onClick={(e) => { e.stopPropagation(); data.onAddIdea(data.id); }}
        className="absolute -bottom-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-md transition-transform hover:scale-110"
        style={{ color: data.color }}
        title="Add idea"
      >
        <Plus className="h-4 w-4" />
      </button>

      <Handle type="source" position={Position.Right} style={{ background: data.color, border: "2px solid white" }} />
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
    </div>
  );
}

export const PillarNode = memo(PillarNodeComponent);
