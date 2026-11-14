declare global {
  interface Window {
    webpayCheckout?: (request: Record<string, any>) => void;
  }
}

export type IpgMode = "TEST" | "LIVE";

export type HackathonTeamPayable = {
  teamNumber: number;
  teamLabel: string;
  payItemId: string;
};

// Official Payable Names & Pay Item IDs from Hackathon Resources (October 2026 Updated).docx
export const HACKATHON_TEAMS: HackathonTeamPayable[] = [
  { teamNumber: 1, teamLabel: "Hackathon Team 1", payItemId: "5558761" },
  { teamNumber: 2, teamLabel: "Hackathon Team 2", payItemId: "9616745" },
  { teamNumber: 3, teamLabel: "Hackathon Team 3", payItemId: "7139718" },
  { teamNumber: 4, teamLabel: "Hackathon Team 4", payItemId: "6948139" },
  { teamNumber: 5, teamLabel: "Hackathon Team 5", payItemId: "2616065" },
  { teamNumber: 6, teamLabel: "Hackathon Team 6", payItemId: "8464606" },
  { teamNumber: 7, teamLabel: "Hackathon Team 7", payItemId: "5826784" },
  { teamNumber: 8, teamLabel: "Hackathon Team 8", payItemId: "9915308" },
  { teamNumber: 9, teamLabel: "Hackathon Team 9", payItemId: "7398012" },
  { teamNumber: 10, teamLabel: "Hackathon Team 10", payItemId: "9381029" },
];

export const IPG_CONFIG = {
  TEST: {
    scriptUrl: "https://newwebpay.qa.interswitchng.com/inline-checkout.js",
    merchantCode: (import.meta.env.VITE_IPG_TEST_MERCHANT_CODE as string) || "MX6072",
    payItemId: (import.meta.env.VITE_IPG_TEST_PAY_ITEM_ID as string) || "9405967",
  },
  LIVE: {
    scriptUrl: "https://newwebpay.interswitchng.com/inline-checkout.js",
    merchantCode: (import.meta.env.VITE_IPG_LIVE_MERCHANT_CODE as string) || "MX153376",
  },
};

const SETTINGS_KEY = "careswitch_ipg_settings";

export type IpgRuntimeSettings = {
  mode: IpgMode;
  teamNumber: number;
  demoTenNairaOverride: boolean;
};

export function getIpgSettings(): IpgRuntimeSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    mode: "TEST",
    teamNumber: 1,
    demoTenNairaOverride: true, // Lets you test LIVE payments with ₦10 (1000 kobo) per hackathon doc
  };
}

export function saveIpgSettings(s: IpgRuntimeSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("ipg-settings-changed"));
}

/** Dynamically loads the QA or PROD Interswitch inline-checkout.js script */
export function loadInterswitchScript(mode: IpgMode): Promise<void> {
  return new Promise((resolve, reject) => {
    const targetSrc = IPG_CONFIG[mode].scriptUrl;
    const existing = document.querySelector(`script[src="${targetSrc}"]`) as HTMLScriptElement | null;
    if (existing && typeof window.webpayCheckout === "function") {
      resolve();
      return;
    }

    // Remove any script from the opposite environment so window.webpayCheckout points to the selected mode
    document
      .querySelectorAll('script[src*="interswitchng.com/inline-checkout.js"]')
      .forEach((el) => el.remove());

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = targetSrc;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load Interswitch script from ${targetSrc}`));
    document.body.appendChild(script);
  });
}

export function generateTxnRef(prefix = "CSW-MED"): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}-${Date.now()}-${rand}`;
}

export async function launchInterswitchCheckout({
  amountKobo,
  custName,
  custEmail,
  payItemName,
  onComplete,
}: {
  amountKobo: number;
  custName: string;
  custEmail: string;
  payItemName: string;
  onComplete: (response: any, txnRef: string, settings: IpgRuntimeSettings) => void;
}): Promise<string> {
  const settings = getIpgSettings();
  await loadInterswitchScript(settings.mode);

  const team = HACKATHON_TEAMS.find((t) => t.teamNumber === settings.teamNumber) ?? HACKATHON_TEAMS[0];
  const merchant_code =
    settings.mode === "LIVE" ? IPG_CONFIG.LIVE.merchantCode : IPG_CONFIG.TEST.merchantCode;
  const pay_item_id =
    settings.mode === "LIVE" ? team.payItemId : IPG_CONFIG.TEST.payItemId;

  const txn_ref = generateTxnRef();

  // Amount in minor denomination (kobo): "1000" = ₦10.00, "3000" = ₦30.00
  const finalAmountKobo = settings.demoTenNairaOverride ? 1000 : Math.max(1000, Math.round(amountKobo));

  const paymentRequest = {
    merchant_code,
    pay_item_id,
    pay_item_name: payItemName,
    txn_ref,
    amount: String(finalAmountKobo),
    currency: 566, // NGN
    cust_name: custName,
    cust_email: custEmail,
    site_redirect_url: window.location.origin + "/passes",
    mode: settings.mode,
    onComplete: (response: any) => {
      console.log("Interswitch IPG Response:", response);
      onComplete(response, txn_ref, settings);
    },
  };

  if (typeof window.webpayCheckout !== "function") {
    throw new Error("Interswitch Webpay script did not initialize. Check your internet connection.");
  }

  window.webpayCheckout(paymentRequest);
  return txn_ref;
}

export function formatNairaFromKobo(kobo: number): string {
  const naira = kobo / 100;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: naira % 1 === 0 ? 0 : 2,
  }).format(naira);
}