-- ==============================================================================
-- PEGA 好物交換所 · 雲端圖庫孤立照片清理權限設定 (Supabase SQL)
-- 說明：請登入 Supabase 後台 -> 左側「SQL Editor」->「New query」貼上並點擊「Run」
-- ==============================================================================

-- 【方法一（推薦）】直接為 storage.objects 開放 item-images bucket 刪除權限
-- 讓前端可以直接透過 Supabase Storage API 批次或單檔刪除照片
DROP POLICY IF EXISTS "Allow anon delete on item-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete on item-images" ON storage.objects;

CREATE POLICY "Allow public delete on item-images"
ON storage.objects FOR DELETE
TO public, anon, authenticated
USING ( bucket_id = 'item-images' );


-- 【方法二】建立高權限版主專用清理 RPC 函數 (clean_orphan_storage_admin)
-- 具備 SECURITY DEFINER 超級權限，並嚴格校驗版主密碼雜湊
CREATE OR REPLACE FUNCTION public.clean_orphan_storage_admin(
  file_names text[],
  pwd_input text
)
RETURNS integer AS $$
DECLARE
  v_is_admin boolean := false;
  v_count integer := 0;
BEGIN
  -- 1. 驗證版主管理密碼
  IF pwd_input IS NOT NULL AND verify_admin_password(pwd_input) THEN
    v_is_admin := true;
  END IF;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION '權限不足：非版主無法執行圖庫清理';
  END IF;

  -- 2. 直接自 storage.objects 刪除指定檔案
  DELETE FROM storage.objects
  WHERE bucket_id = 'item-images'
    AND name = ANY(file_names);
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
