import { NODE_W, NODE_H, V_GAP } from "../constants";
import { coupleWidth } from "./treeLayout";

export function getConnectorPaths(rootNodes, positions) {
  const paths = [];

  function traverse(node) {
    // Spouse connector
    if (node.members.length === 2) {
      const a = positions[node.members[0].id];
      const b = positions[node.members[1].id];

      if (a && b) {
        const y = a.y + NODE_H / 2;
        paths.push(`M${a.x + NODE_W},${y} L${b.x},${y}`);
      }
    }

    // Parent-child connector
    if (node.children.length > 0) {
      const parentY = positions[node.members[0].id]?.y;
      if (parentY === undefined) return;

      let parentCX;
      if (node.members.length === 2) {
        const a = positions[node.members[0].id];
        const b = positions[node.members[1].id];
        parentCX = (a.x + NODE_W + b.x) / 2;
      } else {
        parentCX = positions[node.members[0].id].x + NODE_W / 2;
      }

      const topY = parentY + NODE_H;
      const midY = parentY + NODE_H + V_GAP / 2;

      paths.push(`M${parentCX},${topY} L${parentCX},${midY}`);

      const childCenters = node.children
        .map((child) => {
          const childWidth = coupleWidth(child);
          const firstPos = positions[child.members[0].id];
          if (!firstPos) return null;
          return firstPos.x + childWidth / 2;
        })
        .filter((x) => x !== null);

      if (childCenters.length > 0) {
        const minCX = Math.min(...childCenters, parentCX);
        const maxCX = Math.max(...childCenters, parentCX);

        if (childCenters.length > 1 || childCenters[0] !== parentCX) {
          paths.push(`M${minCX},${midY} L${maxCX},${midY}`);
        }

        const childY = parentY + NODE_H + V_GAP;
        childCenters.forEach((cx) => {
          paths.push(`M${cx},${midY} L${cx},${childY}`);
        });
      }
    }

    node.children.forEach(traverse);
  }

  rootNodes.forEach(traverse);
  return paths;
}
