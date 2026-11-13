import { useEffect, useState } from "react";
import { supabase } from "./supabase.js";
import { isPrivatePhoto, signedPrivatePhotoUrl } from "./privatePhotos.js";

// Short-lived URLs are never persisted in planner records or local storage.
export function usePrivatePhotoUrl(value) {
  const privatePhoto = isPrivatePhoto(value);
  const [signed, setSigned] = useState(null);
  useEffect(() => {
    if (!privatePhoto) { setSigned(null); return; }
    let active = true;
    async function refresh() {
      try {
        const url = await signedPrivatePhotoUrl(supabase, value);
        if (active) setSigned(url);
      } catch {
        if (active) setSigned(null);
      }
    }
    setSigned(null);
    void refresh();
    const interval = setInterval(refresh, 240000);
    return () => { active = false; clearInterval(interval); };
  }, [privatePhoto, value]);
  return privatePhoto ? signed : null;
}
