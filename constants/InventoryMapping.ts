export const CONSUMABLE_MAPPING: Record<string, string> = {
  "น้ำแข็งแก้วใหญ่": "glass_large",
  "น้ำแข็งแก้วเล็ก": "glass_small",
  "โค้ก 330มล": "glass_large",
  "เป๊ปซี่ 345มล": "glass_large",
  "สไปรท์ 330มล": "glass_large",
  "แฟนต้า 330มล น้ำเขียว": "glass_large",
  "แฟนต้า 330มล น้ำแดง": "glass_large",
  "แฟนต้า 330มล น้ำส้ม": "glass_large",
  "แฟนต้า 330มล องุ่นป๊อบ": "glass_large",
  "แก้วเล็ก": "glass_small",
  "แก้วใหญ่": "glass_large",
  "น้ำแข็งถุงใหญ่": "bag_large",
  "น้ำแข็งถุงเล็ก": "bag_small",
};

// Conversion rates for bulk units (Packs/Crates)
export const BULK_CONVERSION: Record<string, number> = {
  "น้ำดื่ม (แพ็ค)": 12,
  "โค้ก 330มล": 12, // Assume 12 per pack for soda
  "เป๊ปซี่ 345มล": 12,
  "สไปรท์ 330มล": 12,
  "แฟนต้า 330มล น้ำเขียว": 12,
  "แฟนต้า 330มล น้ำแดง": 12,
  "แฟนต้า 330มล น้ำส้ม": 12,
  "แฟนต้า 330มล องุ่นป๊อบ": 12,
  "แก้วเล็ก": 50, // Assume 50 per roll/box
  "แก้วใหญ่": 50,
  "ถุงใหญ่": 100, // Assume 100 per pack
  "ถุงเล็ก": 100,
};
