import { LegalDraft } from "@/components/legal/legal-draft";

export default function CookiesPage() {
  return (
    <LegalDraft title="Cookies">
      <h2 className="font-display text-2xl text-cream">Strictly necessary</h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>caramba_pid — httpOnly session cookie, about 30 days, keeps the same seat at a table.</li>
        <li>Supabase auth cookies — only after you log in, so the account session works.</li>
      </ul>
      <h2 className="font-display text-2xl text-cream">Preferences on this device</h2>
      <p>
        Sound and motion choices, and the advertising choice itself, are stored in localStorage after you set them.
        They are not sent to an advertising network.
      </p>
      <h2 className="font-display text-2xl text-cream">Advertising</h2>
      <p>
        No Google advertising script loads until three things are true: you accepted advertising, your account is not
        ad-free or premium, and a real AdSense publisher id is configured. Until that id exists, the dashed
        “Advertisement” boxes are part of Carramba and do not set a third-party cookie.
      </p>
      <p>
        A homemade banner is not a Google-certified consent management platform. Before personalized AdSense ads run
        for people in the EEA, UK, or Switzerland, Google requires a certified TCF CMP. Google’s own Privacy &
        messaging tool is CMP ID 300. Turn that on in AdSense before you put the publisher id in production.
      </p>
      <p>There is no analytics cookie and no advertising personalization cookie in the current build.</p>
    </LegalDraft>
  );
}
