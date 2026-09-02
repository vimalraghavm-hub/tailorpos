export const initialCustomers = [
  {
    id: "CUST-101",
    name: "Kumar",
    phone: "9876543210",
    address: "42 MG Road, Indiranagar, Bangalore",
    totalOrders: 8,
    totalSpent: 14500,
    outstanding: 1200,
    lastOrder: "01 Sep 2026",
    notes: "Prefers slim fit shirts. Double stitching on pant cuffs.",
    measurements: {
      shirt: { length: '28"', shoulder: '17"', chest: '40"', waist: '38"', sleeve: '24"', neck: '15.5"' },
      pant: { length: '40"', waist: '34"', hip: '40"', bottom: '14"', 'in-seam': '30"' },
      blouse: { length: '14"', chest: '36"', waist: '30"', shoulder: '14"', sleeve: '10"' }
    }
  },
  {
    id: "CUST-102",
    name: "Priya",
    phone: "9876543211",
    address: "15 4th Cross, Koramangala, Bangalore",
    totalOrders: 5,
    totalSpent: 9800,
    outstanding: 0,
    lastOrder: "30 Aug 2026",
    notes: "Deep neck blouses with potli buttons. Always requests margin inside.",
    measurements: {
      shirt: { length: '26"', shoulder: '15"', chest: '34"', waist: '30"', sleeve: '21"', neck: '14"' },
      pant: { length: '38"', waist: '28"', hip: '36"', bottom: '12"', 'in-seam': '28"' },
      blouse: { length: '14.5"', chest: '35"', waist: '29"', shoulder: '14.5"', sleeve: '11"' }
    }
  },
  {
    id: "CUST-103",
    name: "Ravi",
    phone: "9876543212",
    address: "88 Commercial Street, Bangalore",
    totalOrders: 12,
    totalSpent: 22400,
    outstanding: 950,
    lastOrder: "29 Aug 2026",
    notes: "Regular fit cotton shirts only. Pocket on left chest mandatory.",
    measurements: {
      shirt: { length: '29.5"', shoulder: '18"', chest: '42"', waist: '40"', sleeve: '25"', neck: '16.5"' },
      pant: { length: '41"', waist: '36"', hip: '42"', bottom: '15"', 'in-seam': '31"' },
      blouse: { length: '15"', chest: '38"', waist: '32"', shoulder: '15"', sleeve: '12"' }
    }
  },
  {
    id: "CUST-104",
    name: "Arun",
    phone: "9876543213",
    address: "102 Residency Road, Bangalore",
    totalOrders: 3,
    totalSpent: 4200,
    outstanding: 500,
    lastOrder: "28 Aug 2026",
    notes: "Prefers French cuff sleeves.",
    measurements: {
      shirt: { length: '27.5"', shoulder: '16.5"', chest: '38"', waist: '34"', sleeve: '23.5"', neck: '15"' },
      pant: { length: '39"', waist: '32"', hip: '38"', bottom: '13.5"', 'in-seam': '29"' },
      blouse: { length: '13.5"', chest: '34"', waist: '28"', shoulder: '13.5"', sleeve: '9"' }
    }
  },
  {
    id: "CUST-105",
    name: "Meena",
    phone: "9876543214",
    address: "77 Jayanagar 4th Block, Bangalore",
    totalOrders: 6,
    totalSpent: 11600,
    outstanding: 0,
    lastOrder: "25 Aug 2026",
    notes: "Anarkali dresses with side zip.",
    measurements: {
      shirt: { length: '27"', shoulder: '15.5"', chest: '36"', waist: '32"', sleeve: '22"', neck: '14.5"' },
      pant: { length: '38.5"', waist: '30"', hip: '38"', bottom: '13"', 'in-seam': '28.5"' },
      blouse: { length: '14"', chest: '36"', waist: '31"', shoulder: '14"', sleeve: '10.5"' }
    }
  },
  {
    id: "CUST-106",
    name: "Anita",
    phone: "9876543215",
    address: "23 Whitefield Main Rd, Bangalore",
    totalOrders: 4,
    totalSpent: 7800,
    outstanding: 1600,
    lastOrder: "26 Aug 2026",
    notes: "Padded designer blouses.",
    measurements: {
      shirt: { length: '26.5"', shoulder: '15"', chest: '35"', waist: '30"', sleeve: '21.5"', neck: '14"' },
      pant: { length: '38"', waist: '29"', hip: '37"', bottom: '13"', 'in-seam': '28"' },
      blouse: { length: '14"', chest: '35"', waist: '29"', shoulder: '14"', sleeve: '10"' }
    }
  }
];

export const initialInvoices = [
  {
    id: "INV-1025",
    customerId: "CUST-101",
    customerName: "Kumar",
    phone: "9876543210",
    date: "01 Sep 2026",
    dueDate: "05 Sep 2026",
    services: [
      { id: 1, name: "Shirt Stitching", qty: 2, rate: 400, amount: 800 }
    ],
    subtotal: 800,
    discount: 0,
    total: 800,
    advancePaid: 300,
    balance: 500,
    paymentMode: "UPI",
    notes: "Formal white shirt with stiff collar",
    status: "Stitching", // Cutting, Stitching, Packing, Ready, Delivered
    cutting: true,
    stitching: true,
    packing: false,
    delivery: false
  },
  {
    id: "INV-1024",
    customerId: "CUST-102",
    customerName: "Priya",
    phone: "9876543211",
    date: "30 Aug 2026",
    dueDate: "04 Sep 2026",
    services: [
      { id: 1, name: "Blouse Stitching", qty: 1, rate: 1200, amount: 1200 }
    ],
    subtotal: 1200,
    discount: 0,
    total: 1200,
    advancePaid: 1200,
    balance: 0,
    paymentMode: "Cash",
    notes: "Silk blouse with piping & tassel rope",
    status: "Ready",
    cutting: true,
    stitching: true,
    packing: true,
    delivery: false
  },
  {
    id: "INV-1023",
    customerId: "CUST-103",
    customerName: "Ravi",
    phone: "9876543212",
    date: "29 Aug 2026",
    dueDate: "03 Sep 2026",
    services: [
      { id: 1, name: "Shirt Stitching", qty: 1, rate: 400, amount: 400 },
      { id: 2, name: "Pant Stitching", qty: 1, rate: 550, amount: 550 }
    ],
    subtotal: 950,
    discount: 0,
    total: 950,
    advancePaid: 0,
    balance: 950,
    paymentMode: "Cash",
    notes: "Formal suit pair setup",
    status: "Packing",
    cutting: true,
    stitching: true,
    packing: true,
    delivery: false
  },
  {
    id: "INV-1022",
    customerId: "CUST-104",
    customerName: "Arun",
    phone: "9876543213",
    date: "28 Aug 2026",
    dueDate: "02 Sep 2026",
    services: [
      { id: 1, name: "Dress Stitching", qty: 1, rate: 1500, amount: 1500 }
    ],
    subtotal: 1500,
    discount: 100,
    total: 1400,
    advancePaid: 900,
    balance: 500,
    paymentMode: "Card",
    notes: "Lining material provided by customer",
    status: "Cutting",
    cutting: true,
    stitching: false,
    packing: false,
    delivery: false
  },
  {
    id: "INV-1021",
    customerId: "CUST-106",
    customerName: "Anita",
    phone: "9876543215",
    date: "26 Aug 2026",
    dueDate: "01 Sep 2026",
    services: [
      { id: 1, name: "Blouse Stitching", qty: 2, rate: 1200, amount: 2400 },
      { id: 2, name: "Alteration", qty: 2, rate: 200, amount: 400 }
    ],
    subtotal: 2800,
    discount: 200,
    total: 2600,
    advancePaid: 1000,
    balance: 1600,
    paymentMode: "UPI",
    notes: "Heavy neck embroidery work",
    status: "Delivered",
    cutting: true,
    stitching: true,
    packing: true,
    delivery: true
  },
  {
    id: "INV-1020",
    customerId: "CUST-105",
    customerName: "Meena",
    phone: "9876543214",
    date: "25 Aug 2026",
    dueDate: "30 Aug 2026",
    services: [
      { id: 1, name: "Dress Stitching", qty: 2, rate: 750, amount: 1500 }
    ],
    subtotal: 1500,
    discount: 0,
    total: 1500,
    advancePaid: 1500,
    balance: 0,
    paymentMode: "UPI",
    notes: "Salwar kameez matching duppata",
    status: "Delivered",
    cutting: true,
    stitching: true,
    packing: true,
    delivery: true
  }
];

export const defaultServicesList = [
  { id: "S1", name: "Shirt Stitching", defaultRate: 400, category: "Men" },
  { id: "S2", name: "Pant Stitching", defaultRate: 350, category: "Men" },
  { id: "S3", name: "Blouse Stitching", defaultRate: 1200, category: "Women" },
  { id: "S4", name: "Dress Stitching", defaultRate: 900, category: "Women" },
  { id: "S5", name: "Suit / Safari Stitching", defaultRate: 2500, category: "Men" },
  { id: "S6", name: "Cutting Service", defaultRate: 150, category: "General" },
  { id: "S7", name: "Alteration", defaultRate: 120, category: "General" },
  { id: "S8", name: "Design / Embroidery", defaultRate: 500, category: "Women" }
];

export const defaultShopSettings = {
  shopName: "Mohit Tailors & Designers",
  tagline: "Smart tailoring. Simple management.",
  phone: "+91 98765 01234",
  address: "Shop No. 12, Main Bazaar, Indiranagar, Bangalore - 560038",
  gstNumber: "29ABCDE1234F1Z5",
  invoicePrefix: "INV-",
  nextInvoiceNumber: 1026,
  theme: "light"
};

export const defaultNotifications = [
  { id: 1, title: "Urgent Delivery", message: "INV-1025 (Kumar) is due today by 6 PM.", time: "10m ago", read: false, type: "urgent" },
  { id: 2, title: "Payment Received", message: "Priya cleared balance ₹1,200 via Cash.", time: "1h ago", read: false, type: "success" },
  { id: 3, title: "Ready for Packing", message: "INV-1023 (Ravi) stitching completed.", time: "3h ago", read: true, type: "info" }
];
