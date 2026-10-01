/** Blender may suffix a root when a scenery mesh already uses its name. */
export const canonicalRootName = (name: string) => name.replace(/\.\d+$/, "");
/** GLTFLoader sanitizes the visible node name, retaining the authored one here. */
export const modelRootName = (root: {
  name: string;
  userData: { name?: unknown };
}) =>
  canonicalRootName(
    typeof root.userData.name === "string" ? root.userData.name : root.name,
  );
