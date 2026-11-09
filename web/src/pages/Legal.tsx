import { usePageMeta } from "../meta";

export function Terms() {
  usePageMeta({ title: "Terms and Conditions", description: "The terms for buying and selling tickets on InterPay." });
  return (
    <main style={{ maxWidth: 760 }}>
      <h1>Terms and Conditions</h1>
      <p className="muted">InterPay is a hackathon project built on the Interswitch Payment Gateway. It is not an official Interswitch product.</p>
      <h2>1. Using InterPay</h2>
      <p>InterPay lets organisers publish events and lets attendees buy tickets. You must give accurate details when you register and when you create an event.</p>
      <h2>2. How payments work</h2>
      <p>Payments are processed on the Interswitch checkout. InterPay verifies each payment with the gateway before issuing tickets. Ticket money is held by the platform until the event outcome is known, then released to the organiser after the event takes place, minus the platform fee shown to the organiser.</p>
      <h2>3. Cancellations and refunds</h2>
      <p>Each organiser chooses whether attendees may cancel. The choice is shown on the event page and again at checkout, and it is saved with your order. If cancellation is allowed, you can cancel until 12 hours before the event starts and the ticket price is refunded. After that, tickets are locked. If cancellation is not allowed, tickets are not refundable, unless the organiser cancels the event or materially changes its date, venue or attendance mode. If an organiser cancels an event, every ticket is refunded in full.</p>
      <h2>4. Payment gateway fees</h2>
      <p>The payment gateway may add a transaction fee at checkout. Fees charged by the gateway are not part of the ticket price.</p>
      <h2>5. Organiser responsibilities</h2>
      <p>Organisers are responsible for the event, the accuracy of the event page, and delivering what they advertise. Payouts require an approved organiser account and a verified payout account. InterPay may unpublish an event or hold a payout while a report or dispute is reviewed.</p>
      <h2>6. Tickets</h2>
      <p>Tickets are personal. Each in-person ticket has a QR code that works once. Each online ticket has a personal join link. Do not share them publicly.</p>
      <h2>7. Liability</h2>
      <p>InterPay is provided as a demonstration service. To the extent allowed by law, we are not liable for losses caused by an event organiser, a payment provider, or events outside our control.</p>
      <h2>8. Contact</h2>
      <p>For questions about an event, use the contact details on its event page. For questions about the platform, contact the InterPay team through the organiser who sold you the ticket.</p>
    </main>
  );
}

export function Privacy() {
  usePageMeta({ title: "Privacy Policy", description: "How InterPay collects, uses and protects your personal data." });
  return (
    <main style={{ maxWidth: 760 }}>
      <h1>Privacy Policy</h1>
      <p className="muted">This policy describes how InterPay handles personal data in line with the Nigeria Data Protection Act 2023.</p>
      <h2>What we collect</h2>
      <p>When you buy a ticket we collect your first name, last name, email address, phone number, your attendance choice (in person or online), optional guest names, and your order and payment references. Organisers also give us their account details and bank account details for payouts. We do not receive or store your card number: card details are entered on the Interswitch checkout.</p>
      <h2>Why we collect it</h2>
      <p>To process your order, verify your payment, issue tickets, send confirmation and reminder emails, process refunds, prevent fraud, and let organisers manage their events.</p>
      <h2>Who sees it</h2>
      <p>The organiser of an event can see the attendees of that event only. Interswitch processes your payment. Our email provider delivers messages to you. We do not sell personal data.</p>
      <h2>How long we keep it</h2>
      <p>We keep order records for as long as needed for refunds, disputes and accounting, then delete or anonymise them.</p>
      <h2>Your rights</h2>
      <p>You can ask to access, correct or delete your personal data, and to object to processing, subject to legal and accounting requirements. Contact the organiser of your event or use the Find my tickets page to retrieve your orders.</p>
      <h2>Security</h2>
      <p>Payments are verified on our servers, ticket links are signed, and organiser bank details are shown only in masked form.</p>
    </main>
  );
}
