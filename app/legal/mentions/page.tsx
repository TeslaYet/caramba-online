import { LegalDraft } from "@/components/legal/legal-draft";

export default function MentionsPage() {
  return (
    <LegalDraft title="Legal notice">
      <p>These fields are empty on purpose. French law requires them once the site is a professional activity.</p>
      <ul className="list-disc space-y-2 pl-5">
        <li>Publisher / director of publication: [LEGAL BUSINESS NAME]</li>
        <li>Legal form: [LEGAL FORM — for example micro-entreprise, SAS, or individual]</li>
        <li>Address: [BUSINESS ADDRESS]</li>
        <li>Email: [CONTACT EMAIL]</li>
        <li>Phone: [PHONE NUMBER]</li>
        <li>SIREN / SIRET: [SIREN/SIRET IF APPLICABLE]</li>
        <li>RCS city and number: [RCS IF APPLICABLE]</li>
        <li>VAT number: [VAT NUMBER OR “VAT not applicable, article 293 B of the CGI” IF THAT IS TRUE]</li>
        <li>Host: Vercel Inc. Copy the current legal name and address from Vercel’s legal pages. Do not guess it.</li>
        <li>Website: https://carramba.online</li>
      </ul>
      <p>
        A hobby site that takes no money and shows no third-party ads is a different situation from a site that sells
        subscriptions or runs AdSense. Confirm with a professional which regime applies before you publish this page
        as final.
      </p>
    </LegalDraft>
  );
}
