-- Seed service categories
INSERT INTO public.service_categories (id, name_en, name_vi, sort_order) VALUES
  ('cat-manicure',  'Manicure',     'Làm Móng Tay',   1),
  ('cat-pedicure',  'Pedicure',     'Làm Móng Chân',  2),
  ('cat-gel',       'Gel & Acrylic','Gel & Acrylic',   3),
  ('cat-nail-art',  'Nail Art',     'Nghệ Thuật Móng', 4),
  ('cat-waxing',    'Waxing',       'Waxing',          5)
ON CONFLICT (id) DO NOTHING;

-- Seed services
INSERT INTO public.services (id, category_id, name_en, name_vi, duration_minutes, price, is_active) VALUES
  -- Manicure
  ('svc-basic-mani',    'cat-manicure', 'Basic Manicure',         'Làm Móng Cơ Bản',         30,  2500,  true),
  ('svc-deluxe-mani',   'cat-manicure', 'Deluxe Manicure',        'Làm Móng Cao Cấp',         45,  3500,  true),
  ('svc-french-mani',   'cat-manicure', 'French Manicure',        'Móng Pháp',                45,  3500,  true),
  -- Pedicure
  ('svc-basic-pedi',    'cat-pedicure', 'Basic Pedicure',         'Chăm Sóc Móng Chân Cơ Bản', 45, 3500,  true),
  ('svc-deluxe-pedi',   'cat-pedicure', 'Deluxe Pedicure',        'Chăm Sóc Móng Chân Cao Cấp',60, 5000,  true),
  ('svc-spa-pedi',      'cat-pedicure', 'Spa Pedicure',           'Spa Móng Chân',             75,  6500,  true),
  -- Gel & Acrylic
  ('svc-gel-color',     'cat-gel',      'Gel Color',              'Sơn Gel',                   60,  4500,  true),
  ('svc-gel-full',      'cat-gel',      'Full Set Gel',           'Bộ Gel Đầy Đủ',             90,  7000,  true),
  ('svc-acrylic-full',  'cat-gel',      'Full Set Acrylic',       'Bộ Acrylic Đầy Đủ',         90,  8000,  true),
  -- Nail Art
  ('svc-nail-art-basic','cat-nail-art', 'Nail Art (per nail)',    'Nghệ Thuật Móng (mỗi móng)', 15,  500,   true),
  ('svc-nail-art-full', 'cat-nail-art', 'Full Nail Art Design',   'Thiết Kế Toàn Bộ',          60,  5500,  true),
  -- Waxing
  ('svc-brow-wax',      'cat-waxing',   'Eyebrow Wax',            'Wax Lông Mày',              15,  1500,  true),
  ('svc-lip-wax',       'cat-waxing',   'Lip Wax',                'Wax Môi',                   10,  1200,  true)
ON CONFLICT (id) DO NOTHING;
