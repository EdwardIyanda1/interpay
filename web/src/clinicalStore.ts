const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

export type UrgencyBadge = "Routine Telemedicine" | "Diagnostic Lab Required" | "Priority Specialist" | "Urgent In-Clinic Vitals";

export type AiTriageReport = {
  id: string;
  createdAt: string;
  patientName: string;
  ageGroup: string;
  symptoms: string;
  duration: string;
  temperatureC?: string;
  systolicBp?: string;
  recommendedSpecialty: string;
  recommendedServiceId: string;
  urgency: UrgencyBadge;
  confidence: number;
  clinicalReasoning: string;
  redFlags: string[];
  prepSteps: string[];
  suggestedLabTests: string[];
};

export type MedicalServiceItem = {
  id: string;
  kind: "CONSULTATION" | "LAB_PANEL" | "OUTREACH";
  title: string;
  specialty: string;
  doctorOrUnit: string;
  hospitalName: string;
  locationOrPlatform: string;
  mode: "IN_CLINIC" | "TELEMEDICINE" | "HYBRID";
  feeKobo: number;
  turnaroundOrDuration: string;
  availableSlots: number;
  description: string;
};

export type PatientPassBooking = {
  id: string;
  txnRef: string;
  ipgResponseCode: string;
  ipgMode: "TEST" | "LIVE";
  teamPayableUsed: string;
  createdAt: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  serviceId: string;
  serviceTitle: string;
  specialty: string;
  doctorOrUnit: string;
  hospitalName: string;
  attendanceMode: "IN_CLINIC" | "TELEMEDICINE";
  amountPaidKobo: number;
  appointmentSlot: string;
  triageSummary?: string;
  urgency?: UrgencyBadge;
  status: "CONFIRMED" | "CHECKED_IN" | "COMPLETED";
  passCode: string;
};

const SERVICES_STORAGE_KEY = "careswitch_medical_services_v1";
const BOOKINGS_STORAGE_KEY = "careswitch_patient_bookings_v1";
const LAST_TRIAGE_KEY = "careswitch_last_triage_v1";

const DEFAULT_MEDICAL_SERVICES: MedicalServiceItem[] = [
  {
    id: "srv-cardio-01",
    kind: "CONSULTATION",
    title: "Cardiology, Blood Pressure & Resting ECG Review",
    specialty: "Cardiology",
    doctorOrUnit: "Dr. Adebayo Ogunleye (Consultant Cardiologist)",
    hospitalName: "Ekiti State Teaching Hospital Specialist Wing",
    locationOrPlatform: "Cardiology Unit, Wing B, Ado-Ekiti & Telemedicine",
    mode: "HYBRID",
    feeKobo: 500000, // ₦5,000 (or ₦10 in Live Demo Override)
    turnaroundOrDuration: "30 mins consult + ECG",
    availableSlots: 14,
    description:
      "Comprehensive cardiovascular evaluation including 12-lead resting ECG, blood pressure profiling, and antihypertensive medication review.",
  },
  {
    id: "srv-lab-malaria-02",
    kind: "LAB_PANEL",
    title: "Acute Fever Panel: Malaria Microscopy, FBC & Widal",
    specialty: "Diagnostics & Pathology",
    doctorOrUnit: "Automated Molecular & Hematology Lab",
    hospitalName: "Crestview Diagnostics & Medical Centre",
    locationOrPlatform: "Phlebotomy Desk, Ground Floor",
    mode: "IN_CLINIC",
    feeKobo: 350000, // ₦3,500
    turnaroundOrDuration: "Results ready in 90 mins",
    availableSlots: 30,
    description:
      "Rapid venous blood screening for Malaria Parasite (MP) density, Full Blood Count (PCV, WBC, Platelets), and Salmonella Typhi antigen.",
  },
  {
    id: "srv-tele-gp-03",
    kind: "CONSULTATION",
    title: "24/7 Primary Care & Prescription Telemedicine Consult",
    specialty: "General Practice",
    doctorOrUnit: "Dr. Funmilayo Alabi (Senior Medical Officer)",
    hospitalName: "CareSwitch Virtual Hospital",
    locationOrPlatform: "Encrypted Video Consultation Link",
    mode: "TELEMEDICINE",
    feeKobo: 250000, // ₦2,500
    turnaroundOrDuration: "20 mins video consult",
    availableSlots: 25,
    description:
      "Immediate video triage with a licensed medical doctor for acute symptoms, lab result interpretation, and digital e-prescription.",
  },
  {
    id: "srv-peds-04",
    kind: "CONSULTATION",
    title: "Pediatric Fever, Nutrition & Immunization Clinic",
    specialty: "Pediatrics",
    doctorOrUnit: "Dr. Chinedu Okonkwo (Consultant Pediatrician)",
    hospitalName: "Lifeline Children & Maternal Hospital",
    locationOrPlatform: "Pediatric Outpatient Clinic (POPD)",
    mode: "HYBRID",
    feeKobo: 400000, // ₦4,000
    turnaroundOrDuration: "30 mins specialist consult",
    availableSlots: 18,
    description:
      "Child wellness assessment, acute pediatric fever management, weight-calibrated dosing, and childhood vaccination catch-up.",
  },
  {
    id: "srv-dental-05",
    kind: "CONSULTATION",
    title: "Dental Pain, Scaling & Periapical X-Ray Assessment",
    specialty: "Dental Care",
    doctorOrUnit: "Dr. Tosin Adeyemi (Dental Surgeon)",
    hospitalName: "Apex Dental & Maxillofacial Clinic",
    locationOrPlatform: "Dental Suite 3",
    mode: "IN_CLINIC",
    feeKobo: 450000, // ₦4,500
    turnaroundOrDuration: "40 mins chair slot",
    availableSlots: 10,
    description:
      "Targeted toothache relief, digital dental X-ray imaging, periodontal gum care, and restorative treatment planning.",
  },
  {
    id: "srv-outreach-06",
    kind: "OUTREACH",
    title: "Campus & Community Metabolic Screening (Glucose + BP + BMI)",
    specialty: "Community Health",
    doctorOrUnit: "Preventive Medicine Outreach Team",
    hospitalName: "University Health Services Centre",
    locationOrPlatform: "Main Campus Health Auditorium",
    mode: "IN_CLINIC",
    feeKobo: 1000, // ₦10.00 live hackathon test ready
    turnaroundOrDuration: "15 mins express vitals",
    availableSlots: 100,
    description:
      "Subsidized ₦10 community screening covering Fasting Blood Sugar, Blood Pressure, BMI calculation, and doctor counselling.",
  },
];

export const QUICK_SYMPTOM_PRESETS = [
  {
    label: "Fever, Chills & Headache",
    symptoms: "High body temperature, chills, bitter taste, frontal headache, and joint weakness for 2 days.",
    temp: "38.6",
    bp: "122/78",
  },
  {
    label: "High BP & Chest Tightness",
    symptoms: "Elevated home blood pressure reading, mild chest tightness on exertion, and occasional palpitations.",
    temp: "36.8",
    bp: "154/96",
  },
  {
    label: "Childhood Fever & Cough",
    symptoms: "4-year-old child with warm body, reduced appetite, and mild cough since yesterday evening.",
    temp: "38.2",
    bp: "",
  },
  {
    label: "Severe Molar Toothache",
    symptoms: "Sharp throbbing pain in lower left molar when drinking cold water or chewing food.",
    temp: "36.9",
    bp: "120/80",
  },
  {
    label: "General Follow-up & Prescription",
    symptoms: "Need a doctor to review my recent blood test results and renew my routine medication.",
    temp: "36.7",
    bp: "118/76",
  },
];

export function getMedicalServices(): MedicalServiceItem[] {
  try {
    const raw = localStorage.getItem(SERVICES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return DEFAULT_MEDICAL_SERVICES;
}

export function addMedicalService(item: Omit<MedicalServiceItem, "id">): MedicalServiceItem {
  const current = getMedicalServices();
  const created: MedicalServiceItem = {
    ...item,
    id: `srv-${Date.now()}`,
  };
  const next = [created, ...current];
  localStorage.setItem(SERVICES_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("clinical-store-updated"));
  return created;
}

export function getPatientBookings(): PatientPassBooking[] {
  try {
    const raw = localStorage.getItem(BOOKINGS_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

export function savePatientBooking(b: Omit<PatientPassBooking, "id" | "createdAt" | "passCode">): PatientPassBooking {
  const existing = getPatientBookings();
  const code = `MED-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${String(existing.length + 1).padStart(2, "0")}`;
  const created: PatientPassBooking = {
    ...b,
    id: `bk-${Date.now()}`,
    createdAt: new Date().toISOString(),
    passCode: code,
  };
  const next = [created, ...existing];
  localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("clinical-store-updated"));

  // Also notify optional backend if configured
  if (API_BASE) {
    fetch(`${API_BASE}/api/clinical-bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(created),
    }).catch(() => {});
  }
  return created;
}

export function updateBookingStatus(id: string, status: PatientPassBooking["status"]) {
  const list = getPatientBookings().map((b) => (b.id === id ? { ...b, status } : b));
  localStorage.setItem(BOOKINGS_STORAGE_KEY, JSON.stringify(list));
  window.dispatchEvent(new Event("clinical-store-updated"));
}

export function getLastTriageReport(): AiTriageReport | null {
  try {
    const raw = localStorage.getItem(LAST_TRIAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function evaluatePatientTriage(input: {
  patientName: string;
  ageGroup: string;
  symptoms: string;
  duration: string;
  temperatureC?: string;
  systolicBp?: string;
}): AiTriageReport {
  const s = input.symptoms.toLowerCase();
  const temp = parseFloat(input.temperatureC || "36.8");
  const bpSys = parseInt((input.systolicBp || "120").split("/")[0], 10);

  let report: Omit<AiTriageReport, "id" | "createdAt">;

  if (/(chest|heart|bp|blood pressure|palpitation|hypertension|breath|dizzy)/.test(s) || bpSys >= 145) {
    report = {
      ...input,
      recommendedSpecialty: "Cardiology",
      recommendedServiceId: "srv-cardio-01",
      urgency: "Urgent In-Clinic Vitals",
      confidence: 95,
      clinicalReasoning:
        "Elevated blood pressure indicators or chest/palpitation symptoms warrant an immediate resting 12-lead ECG and specialist cardiology review.",
      redFlags: [
        "Seek emergency room care immediately if chest pain radiates to the left arm or jaw.",
        "Avoid strenuous physical exertion prior to ECG recording.",
      ],
      prepSteps: [
        "Rest quietly for 10 minutes before your blood pressure is measured.",
        "Bring your current antihypertensive medications or home BP log.",
      ],
      suggestedLabTests: ["12-Lead Resting ECG", "Fasting Lipid Profile", "Serum Electrolytes & Urea"],
    };
  } else if (/(tooth|gum|dental|molar|jaw|cavity|chew)/.test(s)) {
    report = {
      ...input,
      recommendedSpecialty: "Dental Care",
      recommendedServiceId: "srv-dental-05",
      urgency: "Priority Specialist",
      confidence: 93,
      clinicalReasoning:
        "Localized dental and periodontal symptoms require direct chairside examination and periapical X-ray imaging.",
      redFlags: ["Report facial swelling or difficulty swallowing immediately at the dental triage desk."],
      prepSteps: [
        "Rinse gently with warm salt water.",
        "Avoid placing raw analgesics directly against gum tissue.",
      ],
      suggestedLabTests: ["Periapical Digital Dental X-Ray"],
    };
  } else if (/(child|baby|infant|toddler|pediatric|immunization|vaccine)/.test(s) || input.ageGroup === "Child (0-12 yrs)") {
    report = {
      ...input,
      recommendedSpecialty: "Pediatrics",
      recommendedServiceId: "srv-peds-04",
      urgency: "Priority Specialist",
      confidence: 92,
      clinicalReasoning:
        "Pediatric symptoms require weight-calibrated dosing and specialist pediatric assessment to rule out acute infections.",
      redFlags: ["Bring the child in immediately if there is persistent vomiting or lethargy."],
      prepSteps: [
        "Bring the child's immunization and growth chart card.",
        "Keep the child hydrated with oral rehydration fluids.",
      ],
      suggestedLabTests: ["Pediatric Malaria Rapid Test + PCV", "Complete Blood Count"],
    };
  } else if (/(fever|chills|malaria|typhoid|weakness|bitter|headache|body pain)/.test(s) || temp >= 37.8) {
    report = {
      ...input,
      recommendedSpecialty: "Diagnostics & Pathology",
      recommendedServiceId: "srv-lab-malaria-02",
      urgency: "Diagnostic Lab Required",
      confidence: 96,
      clinicalReasoning:
        `Febrile symptoms (${temp >= 37.8 ? `Temp ${temp}°C, ` : ""}${input.duration}) strongly indicate targeted laboratory confirmation for Malaria Parasite density and Full Blood Count before starting antimalarial or antibiotic therapy.`,
      redFlags: ["Do not self-medicate with antibiotics before blood sample collection."],
      prepSteps: [
        "Drink plain water so venous blood sample collection is smooth.",
        "Present your QR Lab Voucher at the phlebotomy desk upon arrival.",
      ],
      suggestedLabTests: ["Giemsa Malaria Microscopy (MP)", "Full Blood Count (FBC)", "Typhoid IgM/IgG Screen"],
    };
  } else {
    report = {
      ...input,
      recommendedSpecialty: "General Practice",
      recommendedServiceId: "srv-tele-gp-03",
      urgency: "Routine Telemedicine",
      confidence: 90,
      clinicalReasoning:
        "Your symptoms are well-suited for a primary care telemedicine video consultation or routine outpatient checkup.",
      redFlags: ["Upgrade to an in-clinic visit if acute fever or severe localized pain develops."],
      prepSteps: [
        "Write down your main questions and current medications.",
        "Ensure a stable internet connection for your video consultation link.",
      ],
      suggestedLabTests: ["Routine Fasting Blood Glucose", "Urinalysis"],
    };
  }

  const saved: AiTriageReport = {
    ...report,
    id: `tri-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem(LAST_TRIAGE_KEY, JSON.stringify(saved));
  return saved;
}