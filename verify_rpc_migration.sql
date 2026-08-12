-- 建立安全前置驗證密碼的 RPC 函數 (verify_post_password)
-- 適用於在開啟編輯視窗前，即時驗證密碼是否正確
CREATE OR REPLACE FUNCTION public.verify_post_password(
  item_uuid uuid,
  dev_id text,
  pwd_input text
)
RETURNS boolean AS $$
DECLARE
  v_item record;
  v_is_admin boolean := false;
BEGIN
  -- 驗證是否為版主
  IF pwd_input IS NOT NULL AND verify_admin_password(pwd_input) THEN
    v_is_admin := true;
  END IF;

  -- 取得商品資料
  SELECT * INTO v_item FROM public.items WHERE id = item_uuid;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- 驗證權限：版主身分、原發布裝置 ID、或輸入正確的 4 位數編輯密碼
  IF v_is_admin OR 
     (v_item.device_id = dev_id AND dev_id IS NOT NULL) OR 
     (v_item.edit_password = pwd_input AND pwd_input IS NOT NULL) THEN
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
