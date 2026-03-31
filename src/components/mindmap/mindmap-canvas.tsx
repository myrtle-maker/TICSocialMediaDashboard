"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";

import { PillarNode, type PillarNodeData } from "./pillar-node";
import { IdeaNode, type IdeaNodeData } from "./idea-node";
import { PostLeafNode, type PostLeafNodeData } from "./post-leaf-node";
import { PillarFormModal } from "./pillar-form-modal";
import { IdeaFormModal } from "./idea-form-modal";
import { PromoteIdeaModal } from "./promote-idea-modal";
import { PostDetailModal } from "@/components/posts/post-detail-modal";
import type { SocialPost } from "@/types/social";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RelatedPost {
  id: string;
  platformPostId: string;
  platform: string;
  caption: string;
  engagementRate: number;
  views: number;
  thumbnailUrl: string | null;
}

interface PostIdeaEnriched {
  id: string;
  pillarId: string;
  title: string;
  notes: string;
  platform: string | null;
  contentType: string | null;
  hookType: string | null;
  targetHashtags: string[];
  keywords: string[];
  status: string;
  scheduledPostId: string | null;
  relatedPosts: RelatedPost[];
}

interface PillarEnriched {
  id: string;
  name: string;
  description: string | null;
  color: string;
  sortOrder: number;
  ideas: PostIdeaEnriched[];
  relatedPosts: RelatedPost[];
}

interface MindmapCanvasProps {
  pillars: PillarEnriched[];
  onRefresh: () => void;
}

// ---------------------------------------------------------------------------
// Dagre layout helper
// ---------------------------------------------------------------------------

const NODE_WIDTH = 220;
const NODE_HEIGHT = 100;
const PILLAR_SIZE = 140;
const LEAF_WIDTH = 200;
const LEAF_HEIGHT = 48;

function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", ranksep: 80, nodesep: 40, marginx: 40, marginy: 40 });

  nodes.forEach((n) => {
    const w = n.type === "pillar" ? PILLAR_SIZE : n.type === "postLeaf" ? LEAF_WIDTH : NODE_WIDTH;
    const h = n.type === "pillar" ? PILLAR_SIZE : n.type === "postLeaf" ? LEAF_HEIGHT : NODE_HEIGHT;
    g.setNode(n.id, { width: w, height: h });
  });
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    const w = n.type === "pillar" ? PILLAR_SIZE : n.type === "postLeaf" ? LEAF_WIDTH : NODE_WIDTH;
    const h = n.type === "pillar" ? PILLAR_SIZE : n.type === "postLeaf" ? LEAF_HEIGHT : NODE_HEIGHT;
    return { ...n, position: { x: pos.x - w / 2, y: pos.y - h / 2 } };
  });
}

// ---------------------------------------------------------------------------
// Build graph elements from MindmapData
// ---------------------------------------------------------------------------

function buildGraphElements(
  pillars: PillarEnriched[],
  callbacks: {
    onAddIdea: (pillarId: string) => void;
    onEditPillar: (pillarId: string) => void;
    onEditIdea: (ideaId: string) => void;
    onDeleteIdea: (ideaId: string) => void;
    onPromoteIdea: (ideaId: string) => void;
    onOpenPost: (postId: string) => void;
  }
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const seenPostIds = new Set<string>();

  for (const pillar of pillars) {
    const pillarNodeId = `pillar-${pillar.id}`;

    nodes.push({
      id: pillarNodeId,
      type: "pillar",
      position: { x: 0, y: 0 },
      data: {
        id: pillar.id,
        name: pillar.name,
        description: pillar.description,
        color: pillar.color,
        ideaCount: pillar.ideas.length,
        onAddIdea: callbacks.onAddIdea,
        onEdit: callbacks.onEditPillar,
      } satisfies PillarNodeData,
    });

    // Pillar-level related posts (leaf nodes directly off pillar)
    for (const post of pillar.relatedPosts) {
      const nodeId = `post-pl-${pillar.id}-${post.id}`;
      seenPostIds.add(nodeId);
      nodes.push({
        id: nodeId,
        type: "postLeaf",
        position: { x: 0, y: 0 },
        data: {
          ...post,
          onOpen: callbacks.onOpenPost,
        } satisfies PostLeafNodeData,
      });
      edges.push({
        id: `e-${pillarNodeId}-${nodeId}`,
        source: pillarNodeId,
        target: nodeId,
        style: { stroke: pillar.color, strokeWidth: 1.5, strokeDasharray: "4 3", opacity: 0.6 },
      });
    }

    // Ideas
    for (const idea of pillar.ideas) {
      const ideaNodeId = `idea-${idea.id}`;
      nodes.push({
        id: ideaNodeId,
        type: "idea",
        position: { x: 0, y: 0 },
        data: {
          id: idea.id,
          title: idea.title,
          notes: idea.notes,
          platform: idea.platform,
          contentType: idea.contentType,
          hookType: idea.hookType,
          status: idea.status,
          pillarColor: pillar.color,
          relatedPostCount: idea.relatedPosts.length,
          onEdit: callbacks.onEditIdea,
          onDelete: callbacks.onDeleteIdea,
          onPromote: callbacks.onPromoteIdea,
        } satisfies IdeaNodeData,
      });
      edges.push({
        id: `e-${pillarNodeId}-${ideaNodeId}`,
        source: pillarNodeId,
        target: ideaNodeId,
        style: { stroke: pillar.color, strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: pillar.color },
      });

      // Idea-level related post leaves
      for (const post of idea.relatedPosts) {
        const nodeId = `post-id-${idea.id}-${post.id}`;
        nodes.push({
          id: nodeId,
          type: "postLeaf",
          position: { x: 0, y: 0 },
          data: {
            ...post,
            onOpen: callbacks.onOpenPost,
          } satisfies PostLeafNodeData,
        });
        edges.push({
          id: `e-${ideaNodeId}-${nodeId}`,
          source: ideaNodeId,
          target: nodeId,
          style: { stroke: "#a1a1aa", strokeWidth: 1.5, opacity: 0.6 },
        });
      }
    }
  }

  const laidOut = applyDagreLayout(nodes, edges);
  return { nodes: laidOut, edges };
}

// ---------------------------------------------------------------------------
// Inner canvas (needs ReactFlowProvider wrapping it)
// ---------------------------------------------------------------------------

const nodeTypes = {
  pillar: PillarNode,
  idea: IdeaNode,
  postLeaf: PostLeafNode,
};

function InnerCanvas({ pillars, onRefresh }: MindmapCanvasProps) {
  // Modal state
  const [pillarModalOpen, setPillarModalOpen] = useState(false);
  const [ideaModalOpen, setIdeaModalOpen] = useState(false);
  const [promoteModalOpen, setPromoteModalOpen] = useState(false);
  const [postModalOpen, setPostModalOpen] = useState(false);

  const [editingPillar, setEditingPillar] = useState<PillarEnriched | null>(null);
  const [editingIdea, setEditingIdea] = useState<PostIdeaEnriched | null>(null);
  const [defaultPillarId, setDefaultPillarId] = useState<string | undefined>();
  const [openPost, setOpenPost] = useState<SocialPost | null>(null);

  // Stable callbacks
  const handleAddIdea = useCallback((pillarId: string) => {
    setDefaultPillarId(pillarId);
    setEditingIdea(null);
    setIdeaModalOpen(true);
  }, []);

  const handleEditPillar = useCallback((pillarId: string) => {
    const pillar = pillars.find((p) => p.id === pillarId) ?? null;
    setEditingPillar(pillar);
    setPillarModalOpen(true);
  }, [pillars]);

  const handleEditIdea = useCallback((ideaId: string) => {
    const idea = pillars.flatMap((p) => p.ideas).find((i) => i.id === ideaId) ?? null;
    setEditingIdea(idea);
    setDefaultPillarId(idea?.pillarId);
    setIdeaModalOpen(true);
  }, [pillars]);

  const handleDeleteIdea = useCallback(async (ideaId: string) => {
    await fetch(`/api/ideas/${ideaId}`, { method: "DELETE" });
    onRefresh();
  }, [onRefresh]);

  const handlePromoteIdea = useCallback((ideaId: string) => {
    const idea = pillars.flatMap((p) => p.ideas).find((i) => i.id === ideaId) ?? null;
    setEditingIdea(idea);
    setPromoteModalOpen(true);
  }, [pillars]);

  const handleOpenPost = useCallback(async (postId: string) => {
    try {
      const res = await fetch(`/api/posts?limit=500`);
      const data = await res.json();
      const post = (data.posts as SocialPost[]).find((p) => p.id === postId) ?? null;
      if (post) {
        setOpenPost(post);
        setPostModalOpen(true);
      }
    } catch { /* ignore */ }
  }, []);

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => buildGraphElements(pillars, {
    onAddIdea: handleAddIdea,
    onEditPillar: handleEditPillar,
    onEditIdea: handleEditIdea,
    onDeleteIdea: handleDeleteIdea,
    onPromoteIdea: handlePromoteIdea,
    onOpenPost: handleOpenPost,
  }), [pillars, handleAddIdea, handleEditPillar, handleEditIdea, handleDeleteIdea, handlePromoteIdea, handleOpenPost]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <>
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <Button
          size="sm"
          onClick={() => { setEditingPillar(null); setPillarModalOpen(true); }}
          className="shadow-md"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Pillar
        </Button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#d4d4d8" />
        <Controls />
        <MiniMap nodeStrokeWidth={3} zoomable pannable />
      </ReactFlow>

      <PillarFormModal
        open={pillarModalOpen}
        onClose={() => setPillarModalOpen(false)}
        onSaved={onRefresh}
        editPillar={editingPillar}
      />
      <IdeaFormModal
        open={ideaModalOpen}
        onClose={() => setIdeaModalOpen(false)}
        onSaved={onRefresh}
        defaultPillarId={defaultPillarId}
        editIdea={editingIdea}
      />
      <PromoteIdeaModal
        open={promoteModalOpen}
        onClose={() => setPromoteModalOpen(false)}
        onPromoted={onRefresh}
        idea={editingIdea}
      />
      <PostDetailModal
        post={openPost}
        open={postModalOpen}
        onClose={() => { setPostModalOpen(false); setOpenPost(null); }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Public export — wraps InnerCanvas with the provider
// ---------------------------------------------------------------------------

export function MindmapCanvas(props: MindmapCanvasProps) {
  return (
    <ReactFlowProvider>
      <div className="relative h-full w-full">
        <InnerCanvas {...props} />
      </div>
    </ReactFlowProvider>
  );
}
