// Remembers the owner's private edit link on this device so they can come back
// and refresh their meeting link without having to find the original link.
const KEY = "virtual-expo:my-booth";

export interface MyBooth {
  id: string;
  token: string;
}

export function saveMyBooth(b: MyBooth): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(b));
  } catch {
    /* storage unavailable (private mode) — the edit link still works */
  }
}

export function loadMyBooth(): MyBooth | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<MyBooth>;
    return v.id && v.token ? { id: v.id, token: v.token } : null;
  } catch {
    return null;
  }
}

export function editPath(b: MyBooth): string {
  return `/edit/${b.id}#token=${b.token}`;
}
