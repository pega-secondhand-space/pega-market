-- 1. 新增編輯密碼欄位至 items 資料表 (相容舊資料，舊資料預設為 NULL)
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS edit_password text;

-- 2. 建立安全修改貼文的 RPC 函數 (update_item_secured)
CREATE OR REPLACE FUNCTION public.update_item_secured(
  item_id uuid,
  new_title text,
  new_price text,
  new_type text,
  new_contact_info text,
  new_description text,
  new_image_url text,
  device_id_input text,
  pwd_input text,
  admin_pwd_input text
)
RETURNS boolean AS $$
DECLARE
  v_item record;
  v_is_admin boolean := false;
BEGIN
  -- 驗證是否為版主
  IF admin_pwd_input IS NOT NULL AND verify_admin_password(admin_pwd_input) THEN
    v_is_admin := true;
  END IF;

  -- 取得該商品原始資料
  SELECT * INTO v_item FROM public.items WHERE id = item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION '找不到該商品貼文';
  END IF;

  -- 驗證權限：版主身分、同裝置ID、或輸入正確的 4 位數編輯密碼
  IF v_is_admin OR 
     (v_item.device_id = device_id_input AND device_id_input IS NOT NULL) OR 
     (v_item.edit_password = pwd_input AND pwd_input IS NOT NULL) THEN
     
    -- 執行更新
    UPDATE public.items 
    SET 
      title = new_title,
      price = new_price,
      type = new_type,
      contact_info = new_contact_info,
      description = new_description,
      image_url = new_image_url
    WHERE id = item_id;
    
    RETURN true;
  ELSE
    RAISE EXCEPTION '權限不足：無法編輯此貼文';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 建立安全下架貼文的 RPC 函數 (delete_item_secured)
CREATE OR REPLACE FUNCTION public.delete_item_secured(
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

  -- 取得商品
  SELECT * INTO v_item FROM public.items WHERE id = item_uuid;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- 驗證權限：版主身分、同裝置ID、或輸入正確的 4 位數編輯密碼
  IF v_is_admin OR 
     (v_item.device_id = dev_id AND dev_id IS NOT NULL) OR 
     (v_item.edit_password = pwd_input AND pwd_input IS NOT NULL) THEN
     
    DELETE FROM public.items WHERE id = item_uuid;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 建立安全標記已售出並下架的 RPC 函數 (toggle_item_sold_secured)
CREATE OR REPLACE FUNCTION public.toggle_item_sold_secured(
  item_uuid uuid,
  dev_id text,
  new_desc text,
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

  -- 取得商品
  SELECT * INTO v_item FROM public.items WHERE id = item_uuid;
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- 驗證權限：版主身分、同裝置ID、或輸入正確的 4 位數編輯密碼
  IF v_is_admin OR 
     (v_item.device_id = dev_id AND dev_id IS NOT NULL) OR 
     (v_item.edit_password = pwd_input AND pwd_input IS NOT NULL) THEN
     
    UPDATE public.items SET description = new_desc WHERE id = item_uuid;
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
