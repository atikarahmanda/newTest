import { NODE_W, NODE_H, COUPLE_GAP, H_GAP, V_GAP, PADDING } from "../constants";

export function coupleWidth(node) {
  return node.members.length * NODE_W + (node.members.length > 1 ? COUPLE_GAP : 0);
}

export function subtreeWidth(node) {
  const ownWidth = coupleWidth(node);
  if (!node.children.length) return ownWidth;

  const childrenWidth = node.children.reduce(
    (sum, child, index) => sum + subtreeWidth(child) + (index > 0 ? H_GAP : 0),
    0
  );

  return Math.max(ownWidth, childrenWidth);
}

export function layoutTree(node, sx, sy) {
  const sw = subtreeWidth(node);
  const cw = coupleWidth(node);
  const px = sx + (sw - cw) / 2;

  const positions = {};

  node.members.forEach((member, index) => {
    positions[member.id] = {
      x: px + index * (NODE_W + COUPLE_GAP),
      y: sy,
    };
  });

  let cx = sx;

  const childrenTotalWidth = node.children.reduce(
    (sum, child, index) => sum + subtreeWidth(child) + (index > 0 ? H_GAP : 0),
    0
  );

  const childOffset =
    childrenTotalWidth < cw ? sx + (sw - childrenTotalWidth) / 2 : sx;

  for (const child of node.children) {
    const childWidth = subtreeWidth(child);
    const actualCx = childrenTotalWidth < cw ? childOffset + (cx - sx) : cx;

    const childPositions = layoutTree(child, actualCx, sy + NODE_H + V_GAP);
    Object.assign(positions, childPositions);

    cx += childWidth + H_GAP;
  }

  return positions;
}

export function computeFullLayout(rootNodes) {
  let positions = {};
  let offsetX = PADDING;

  for (const root of rootNodes) {
    const sw = subtreeWidth(root);
    const rootPositions = layoutTree(root, offsetX, PADDING);
    Object.assign(positions, rootPositions);
    offsetX += sw + H_GAP * 2;
  }

  return positions;
}
