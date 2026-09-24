export const initialCustomers = [
  {
    id: "CUST-101",
    name: "Ananya Sharma",
    phone: "9876543210",
    address: "Flat 4B, Lotus Apartments, Indiranagar, Bangalore",
    totalOrders: 2,
    totalSpent: 7300,
    outstanding: 3800,
    lastOrder: "10 Sep 2026",
    notes: "Bridal fitting required. Prefers deep back neck and double lining.",
    measurements: {
      gown: { length: '58"', shoulder: '15"', sleeve: '22"', bust: '38"', waist: '30"', hip: '38"', armHole: '16"', neck: '7"' },
      blouse: { length: '14.5"', shoulder: '15"', sleeve: '11"', bust: '38"', waist: '30"', armHole: '16"', neck: '7"' },
      top: { length: '24"', shoulder: '15"', sleeve: '16"', bust: '38"', waist: '32"' },
      shirt: { length: '28"', shoulder: '15"', chest: '38"', waist: '30"', sleeve: '22"', neck: '14.5"' },
      pant: { length: '39"', waist: '30"', hip: '38"', bottom: '13"', 'in-seam': '29"' },
      custom: { notes: "Extra margin on sides." }
    }
  },
  {
    id: "CUST-102",
    name: "Priya Nair",
    phone: "9876543211",
    address: "15 4th Cross, Koramangala, Bangalore",
    totalOrders: 1,
    totalSpent: 2600,
    outstanding: 0,
    lastOrder: "08 Sep 2026",
    notes: "Deep neck blouses with potli buttons. Always requests margin inside.",
    measurements: {
      gown: { length: '54"', shoulder: '14.5"', sleeve: '18"', bust: '35"', waist: '29"', hip: '36"', armHole: '15"', neck: '6.5"' },
      blouse: { length: '14.5"', shoulder: '14.5"', sleeve: '11"', bust: '35"', waist: '29"', armHole: '15"', neck: '6.5"' },
      top: { length: '23"', shoulder: '14.5"', sleeve: '15"', bust: '35"', waist: '29"' },
      shirt: { length: '26"', shoulder: '14.5"', chest: '35"', waist: '29"', sleeve: '21"', neck: '14"' },
      pant: { length: '38"', waist: '29"', hip: '36"', bottom: '12"', 'in-seam': '28"' },
      custom: { notes: "Potli buttons on back seam." }
    }
  },
  {
    id: "CUST-103",
    name: "Kavya Menon",
    phone: "9876543212",
    address: "88 Commercial Street, Bangalore",
    totalOrders: 1,
    totalSpent: 5100,
    outstanding: 3100,
    lastOrder: "05 Sep 2026",
    notes: "Wedding gown stitching with net cape.",
    measurements: {
      gown: { length: '56"', shoulder: '15"', sleeve: '20"', bust: '36"', waist: '31"', hip: '39"', armHole: '16"', neck: '7"' },
      blouse: { length: '14"', shoulder: '15"', sleeve: '10"', bust: '36"', waist: '31"', armHole: '16"', neck: '7"' },
      top: { length: '24"', shoulder: '15"', sleeve: '16"', bust: '36"', waist: '31"' },
      shirt: { length: '27"', shoulder: '15"', chest: '36"', waist: '31"', sleeve: '22"', neck: '14.5"' },
      pant: { length: '39"', waist: '31"', hip: '39"', bottom: '13"', 'in-seam': '28.5"' },
      custom: { notes: "Net cape attachment." }
    }
  },
  {
    id: "CUST-104",
    name: "Meera Krishnan",
    phone: "9876543213",
    address: "102 Residency Road, Bangalore",
    totalOrders: 1,
    totalSpent: 1800,
    outstanding: 0,
    lastOrder: "01 Sep 2026",
    notes: "Designer padded blouse.",
    measurements: {
      gown: { length: '52"', shoulder: '14"', sleeve: '16"', bust: '34"', waist: '28"', hip: '36"', armHole: '14.5"', neck: '6"' },
      blouse: { length: '13.5"', shoulder: '14"', sleeve: '9"', bust: '34"', waist: '28"', armHole: '14.5"', neck: '6"' },
      top: { length: '22"', shoulder: '14"', sleeve: '14"', bust: '34"', waist: '28"' },
      shirt: { length: '26"', shoulder: '14"', chest: '34"', waist: '28"', sleeve: '20"', neck: '13.5"' },
      pant: { length: '37"', waist: '28"', hip: '36"', bottom: '12"', 'in-seam': '27.5"' },
      custom: { notes: "Padded blouse styling." }
    }
  },
  {
    id: "CUST-105",
    name: "Divya Raj",
    phone: "9876543214",
    address: "77 Jayanagar 4th Block, Bangalore",
    totalOrders: 1,
    totalSpent: 4000,
    outstanding: 1500,
    lastOrder: "03 Sep 2026",
    notes: "Anarkali gown with side zip.",
    measurements: {
      gown: { length: '55"', shoulder: '15"', sleeve: '19"', bust: '37"', waist: '32"', hip: '40"', armHole: '16.5"', neck: '7"' },
      blouse: { length: '14"', shoulder: '15"', sleeve: '10.5"', bust: '37"', waist: '32"', armHole: '16.5"', neck: '7"' },
      top: { length: '24"', shoulder: '15"', sleeve: '16"', bust: '37"', waist: '32"' },
      shirt: { length: '28"', shoulder: '15"', chest: '37"', waist: '32"', sleeve: '22"', neck: '14.5"' },
      pant: { length: '39.5"', waist: '32"', hip: '40"', bottom: '13.5"', 'in-seam': '29"' },
      custom: { notes: "Concealed side zip." }
    }
  }
];

export const initialInvoices = [
  {
    id: "INV-1027",
    customerId: "CUST-101",
    customerName: "Ananya Sharma",
    phone: "9876543210",
    date: "10 Sep 2026",
    dueDate: "17 Sep 2026",
    services: [
      { id: "S101", name: "Bridal Gown Stitching", qty: 1, rate: 5000, amount: 5000, status: "STITCHING" },
      { id: "S102", name: "Finishing & Lining", qty: 1, rate: 800, amount: 800, status: "CUTTING" }
    ],
    subtotal: 5800,
    discount: 0,
    total: 5800,
    advancePaid: 2000,
    balance: 3800,
    paymentMode: "UPI",
    notes: "Bridal gown with double lining. Check armhole depth.",
    material: "Customer provided bridal fabric",
    garmentType: "Bridal Gown",
    measurements: {
      gown: { length: '56"', shoulder: '15"', sleeve: '22"', bust: '36"', waist: '30"', hip: '38"', armHole: '16"', neck: '7"' },
      blouse: { length: '14"', shoulder: '15"', sleeve: '10"', bust: '36"', waist: '30"', armHole: '16"', neck: '7"' },
      top: { length: '24"', shoulder: '15"', sleeve: '16"', bust: '36"', waist: '30"' },
      shirt: { length: '28"', shoulder: '15"', chest: '36"', waist: '30"', sleeve: '22"', neck: '14.5"' },
      pant: { length: '39"', waist: '30"', hip: '38"', bottom: '13"', 'in-seam': '29"' },
      custom: { notes: "Historical measurement snapshot (Bust 36)." }
    }
  },
  {
    id: "INV-1034",
    customerId: "CUST-101",
    customerName: "Ananya Sharma",
    phone: "9876543210",
    date: "01 Sep 2026",
    dueDate: "08 Sep 2026",
    services: [
      { id: "S103", name: "Blouse Stitching (Designer)", qty: 1, rate: 1500, amount: 1500, status: "DELIVERED" }
    ],
    subtotal: 1500,
    discount: 0,
    total: 1500,
    advancePaid: 1500,
    balance: 0,
    paymentMode: "Cash",
    notes: "Silk blouse with piping",
    material: "Silk saree fabric",
    garmentType: "Blouse",
    measurements: {
      gown: { length: '56"', shoulder: '15"', sleeve: '22"', bust: '36"', waist: '30"', hip: '38"', armHole: '16"', neck: '7"' },
      blouse: { length: '14"', shoulder: '15"', sleeve: '10"', bust: '36"', waist: '30"', armHole: '16"', neck: '7"' },
      top: { length: '24"', shoulder: '15"', sleeve: '16"', bust: '36"', waist: '30"' },
      shirt: { length: '28"', shoulder: '15"', chest: '36"', waist: '30"', sleeve: '22"', neck: '14.5"' },
      pant: { length: '39"', waist: '30"', hip: '38"', bottom: '13"', 'in-seam': '29"' },
      custom: { notes: "Old order measurement snapshot (Bust 36)." }
    }
  },
  {
    id: "INV-1028",
    customerId: "CUST-102",
    customerName: "Priya Nair",
    phone: "9876543211",
    date: "08 Sep 2026",
    dueDate: "14 Sep 2026",
    services: [
      { id: "S201", name: "Bridal Blouse Stitching", qty: 1, rate: 2200, amount: 2200, status: "READY" },
      { id: "S202", name: "Sleeve Alteration", qty: 1, rate: 400, amount: 400, status: "STITCHING" }
    ],
    subtotal: 2600,
    discount: 0,
    total: 2600,
    advancePaid: 2600,
    balance: 0,
    paymentMode: "UPI",
    notes: "Padded designer blouse",
    material: "Customer fabric",
    garmentType: "Blouse",
    measurements: {
      gown: { length: '54"', shoulder: '14.5"', sleeve: '18"', bust: '35"', waist: '29"', hip: '36"', armHole: '15"', neck: '6.5"' },
      blouse: { length: '14.5"', shoulder: '14.5"', sleeve: '11"', bust: '35"', waist: '29"', armHole: '15"', neck: '6.5"' },
      top: { length: '23"', shoulder: '14.5"', sleeve: '15"', bust: '35"', waist: '29"' },
      shirt: { length: '26"', shoulder: '14.5"', chest: '35"', waist: '29"', sleeve: '21"', neck: '14"' },
      pant: { length: '38"', waist: '29"', hip: '36"', bottom: '12"', 'in-seam': '28"' }
    }
  },
  {
    id: "INV-1029",
    customerId: "CUST-103",
    customerName: "Kavya Menon",
    phone: "9876543212",
    date: "05 Sep 2026",
    dueDate: "12 Sep 2026",
    services: [
      { id: "S301", name: "Wedding Gown Stitching", qty: 1, rate: 4500, amount: 4500, status: "CUTTING" },
      { id: "S302", name: "Lining Attachment", qty: 1, rate: 600, amount: 600, status: "PENDING" }
    ],
    subtotal: 5100,
    discount: 0,
    total: 5100,
    advancePaid: 2000,
    balance: 3100,
    paymentMode: "Card",
    notes: "Wedding gown stitching with cape",
    material: "Satin fabric",
    garmentType: "Wedding Dress",
    measurements: {
      gown: { length: '56"', shoulder: '15"', sleeve: '20"', bust: '36"', waist: '31"', hip: '39"', armHole: '16"', neck: '7"' },
      blouse: { length: '14"', shoulder: '15"', sleeve: '10"', bust: '36"', waist: '31"', armHole: '16"', neck: '7"' },
      top: { length: '24"', shoulder: '15"', sleeve: '16"', bust: '36"', waist: '31"' },
      shirt: { length: '27"', shoulder: '15"', chest: '36"', waist: '31"', sleeve: '22"', neck: '14.5"' },
      pant: { length: '39"', waist: '31"', hip: '39"', bottom: '13"', 'in-seam': '28.5"' }
    }
  },
  {
    id: "INV-1030",
    customerId: "CUST-104",
    customerName: "Meera Krishnan",
    phone: "9876543213",
    date: "01 Sep 2026",
    dueDate: "06 Sep 2026",
    services: [
      { id: "S401", name: "Blouse Stitching", qty: 1, rate: 1800, amount: 1800, status: "DELIVERED" }
    ],
    subtotal: 1800,
    discount: 0,
    total: 1800,
    advancePaid: 1800,
    balance: 0,
    paymentMode: "Cash",
    notes: "Regular silk blouse",
    material: "Silk fabric",
    garmentType: "Blouse",
    measurements: {
      gown: { length: '52"', shoulder: '14"', sleeve: '16"', bust: '34"', waist: '28"', hip: '36"', armHole: '14.5"', neck: '6"' },
      blouse: { length: '13.5"', shoulder: '14"', sleeve: '9"', bust: '34"', waist: '28"', armHole: '14.5"', neck: '6"' },
      top: { length: '22"', shoulder: '14"', sleeve: '14"', bust: '34"', waist: '28"' },
      shirt: { length: '26"', shoulder: '14"', chest: '34"', waist: '28"', sleeve: '20"', neck: '13.5"' },
      pant: { length: '37"', waist: '28"', hip: '36"', bottom: '12"', 'in-seam': '27.5"' }
    }
  },
  {
    id: "INV-1031",
    customerId: "CUST-105",
    customerName: "Divya Raj",
    phone: "9876543214",
    date: "03 Sep 2026",
    dueDate: "11 Sep 2026",
    services: [
      { id: "S501", name: "Gown Stitching", qty: 1, rate: 3500, amount: 3500, status: "PACKING" },
      { id: "S502", name: "Finishing", qty: 1, rate: 500, amount: 500, status: "READY" }
    ],
    subtotal: 4000,
    discount: 0,
    total: 4000,
    advancePaid: 2500,
    balance: 1500,
    paymentMode: "UPI",
    notes: "Anarkali gown with side zip",
    material: "Georgette fabric",
    garmentType: "Gown",
    measurements: {
      gown: { length: '55"', shoulder: '15"', sleeve: '19"', bust: '37"', waist: '32"', hip: '40"', armHole: '16.5"', neck: '7"' },
      blouse: { length: '14"', shoulder: '15"', sleeve: '10.5"', bust: '37"', waist: '32"', armHole: '16.5"', neck: '7"' },
      top: { length: '24"', shoulder: '15"', sleeve: '16"', bust: '37"', waist: '32"' },
      shirt: { length: '28"', shoulder: '15"', chest: '37"', waist: '32"', sleeve: '22"', neck: '14.5"' },
      pant: { length: '39.5"', waist: '32"', hip: '40"', bottom: '13.5"', 'in-seam': '29"' }
    }
  }
];

export const defaultServicesList = [
  { id: "S1", name: "Bridal Gown Stitching", defaultRate: 5000, category: "Bridal" },
  { id: "S2", name: "Wedding Dress Stitching", defaultRate: 4500, category: "Bridal" },
  { id: "S3", name: "Blouse Stitching (Designer)", defaultRate: 1800, category: "Women" },
  { id: "S4", name: "Blouse Stitching (Regular)", defaultRate: 1200, category: "Women" },
  { id: "S5", name: "Lehenga Stitching & Finishing", defaultRate: 3500, category: "Bridal" },
  { id: "S6", name: "Dress / Anarkali Stitching", defaultRate: 1500, category: "Women" },
  { id: "S7", name: "Shirt Stitching", defaultRate: 400, category: "Men" },
  { id: "S8", name: "Pant Stitching", defaultRate: 350, category: "Men" },
  { id: "S9", name: "Cutting Service", defaultRate: 150, category: "General" },
  { id: "S10", name: "Alteration / Finishing", defaultRate: 250, category: "General" },
  { id: "S11", name: "Design / Embroidery Work", defaultRate: 800, category: "Women" }
];

export const defaultShopSettings = {
  shopName: "Mohit Tailors & Designers",
  tagline: "Smart tailoring. Simple management.",
  phone: "+91 98765 01234",
  address: "Shop No. 12, Main Bazaar, Indiranagar, Bangalore - 560038",
  gstNumber: "29ABCDE1234F1Z5",
  invoicePrefix: "INV-",
  nextInvoiceNumber: 1035,
  theme: "light"
};

export const defaultNotifications = [
  { id: 1, title: "Urgent Delivery", message: "INV-1027 (Ananya Sharma) is due today by 6 PM.", time: "10m ago", read: false, type: "urgent" },
  { id: 2, title: "Payment Received", message: "Priya Nair cleared balance ₹2,600 via UPI.", time: "1h ago", read: false, type: "success" },
  { id: 3, title: "Ready for Delivery", message: "INV-1028 (Priya Nair) blouse stitching completed.", time: "3h ago", read: true, type: "info" }
];
