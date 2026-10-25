// FILE: teacher-app/src/components/ui/Avatar.tsx
// Source: admin App.tsx -> Avatar [6537-6588]
// @ts-nocheck
import { useState } from "react";
import { C } from "../../theme/theme";

 export const Avatar = ({ teacher, size = 44 }) => {
  const [imgErr, setImgErr] = useState(false);
  const url = teacher?.avatar_url;
  const initials = (teacher?.full_name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const isFemale = teacher?.gender === "Female";
  const bg = isFemale ? `${C.purple}33` : `${C.blue}33`;
  const col = isFemale ? C.purple : C.blue;

  if (url && !imgErr) {
    return (
      <img
        src={url}
        onError={() => setImgErr(true)}
        alt={teacher?.full_name}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: `2px solid ${col}55`,
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.34,
        fontWeight: 700,
        color: col,
        border: `2px solid ${col}55`,
        letterSpacing: "-0.5px",
      }}
    >
      {initials}
    </div>
  );
};
