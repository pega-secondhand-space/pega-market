-- 1. 插入置頂商品系統虛擬項目到 items 表，以符合 UUID 與外鍵約束
INSERT INTO public.items (id, title, price, type, device_id, nickname)
VALUES ('00000000-0000-0000-0000-000000000013', 'SYSTEM_PINNED_IDS', '0', 'SYSTEM', 'SYSTEM', 'SYSTEM')
ON CONFLICT (id) DO NOTHING;

-- 2. 重新定義 toggle_pin_item_admin，使用系統預留 UUID 代替舊有字串 ID
CREATE OR REPLACE FUNCTION public.toggle_pin_item_admin(pinned_ids_json text, pwd_input text)
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  IF NOT public.verify_admin_password(pwd_input) THEN
    RAISE EXCEPTION 'Unauthorized admin access';
  END IF;

  -- 刪除舊置頂紀錄
  DELETE FROM public.messages WHERE item_id = '00000000-0000-0000-0000-000000000013';
  -- 寫入新置頂紀錄
  INSERT INTO public.messages (item_id, sender_id, sender_name, content)
  VALUES ('00000000-0000-0000-0000-000000000013', 'ADMIN', 'ADMIN', pinned_ids_json);
  RETURN true;
END;
$$ LANGUAGE plpgsql;
