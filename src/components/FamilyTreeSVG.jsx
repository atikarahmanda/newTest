import { useMemo } from "react";
import { NODE_W, NODE_H } from "../backend/constants";
import { getConnectorPaths } from "../backend/connectors";
import { genderMeta } from "../genderMeta";

export default function FamilyTreeSVG({
  rootNodes,
  positions,
  persons,
  onClickPerson,
}) {
  const paths = useMemo(
    () => getConnectorPaths(rootNodes, positions),
    [rootNodes, positions]
  );

  const allPos = Object.entries(positions);

  const personMap = useMemo(
    () => new Map(persons.map((p) => [p.id, p])),
    [persons]
  );

  return (
    <g>
      {/* Connectors */}
      {paths.map((d, index) => (
        <path
          key={`connector-${index}`}
          d={d}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}

      {/* Person nodes */}
      {allPos.map(([id, pos]) => {
        const person = personMap.get(id);
        if (!person) return null;

        const g = genderMeta(person.gender);

        return (
          <g
            key={id}
            data-clickable="true"
            onClick={() => onClickPerson(person)}
            style={{ cursor: "pointer" }}
          >
            {/* Shadow */}
            <rect
              x={pos.x + 1}
              y={pos.y + 2}
              width={NODE_W}
              height={NODE_H}
              rx={14}
              fill="#0001"
            />

            {/* Card */}
            <rect
              x={pos.x}
              y={pos.y}
              width={NODE_W}
              height={NODE_H}
              rx={14}
              fill="white"
              stroke="#e2e8f0"
              strokeWidth={1.2}
            />

            {/* Top accent */}
            <rect
              x={pos.x + 1}
              y={pos.y + 1}
              width={NODE_W - 2}
              height={4}
              fill={g.svg.accent}
              opacity="0.9"
            />

            {/* Avatar */}
            <circle
              cx={pos.x + 22}
              cy={pos.y + NODE_H / 2 + 3}
              r={14}
              fill={g.svg.avatarFill}
              stroke={g.svg.avatarStroke}
              strokeWidth="1"
            />

            {person.photoUrl ? (
              <image
                href={person.photoUrl}
                x={pos.x + 8}
                y={pos.y + NODE_H / 2 - 11}
                width="28"
                height="28"
                preserveAspectRatio="xMidYMid slice"
                clipPath={`circle(14px at ${pos.x + 22}px ${pos.y + NODE_H / 2 + 3}px)`}
              />
            ) : (
              <text
                x={pos.x + 22}
                y={pos.y + NODE_H / 2 + 8}
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill={g.svg.accent}
              >
                {person.name.charAt(0)}
              </text>
            )}

            {/* Name */}
            <text
              x={pos.x + 42}
              y={pos.y + NODE_H / 2 + 2}
              fontSize="11.5"
              fontWeight="500"
              fill="#1e293b"
              textAnchor="start"
              dominantBaseline="middle"
            >
              {person.name.length > 11 ? `${person.name.slice(0, 10)}…` : person.name}
            </text>

            {/* Birth year */}
            {person.birthDate && (
              <text
                x={pos.x + 42}
                y={pos.y + NODE_H / 2 + 16}
                fontSize="9.5"
                fill="#94a3b8"
                textAnchor="start"
                dominantBaseline="middle"
              >
                {new Date(person.birthDate).getFullYear()}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}
