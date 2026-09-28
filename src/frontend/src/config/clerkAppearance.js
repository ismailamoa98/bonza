// config/clerkAppearance.js — themes Clerk's <SignIn>/<SignUp> to Bonza so they stop looking like a
// third-party widget. AuthLayout supplies the card/header/footer, so those Clerk elements are hidden here.
export const clerkAppearance = {
  variables: {
    colorPrimary: "#141210", // dark submit button
    colorText: "#141210",
    colorTextSecondary: "#7A7269",
    colorBackground: "#FCFBF9",
    colorInputBackground: "#FFFFFF",
    colorInputText: "#141210",
    colorDanger: "#96450A",
    colorSuccess: "#1B7040",
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: "14px",
    borderRadius: "11px",
    spacingUnit: "1rem",
  },

  elements: {
    // Kill Clerk's own card chrome — AuthLayout provides the panel. In Clerk v5 the shadow/border live on
    // the outer `cardBox`, so both it and the inner `card` must be flattened.
    rootBox: "w-full",
    cardBox: "w-full shadow-none border-none bg-transparent",
    card: "w-full shadow-none border-none bg-transparent p-0 gap-4",
    header: "hidden", // AuthLayout renders the heading
    footer: "hidden", // AuthLayout renders the legal line
    footerAction: "hidden",

    // Social buttons
    socialButtonsBlockButton:
      "border border-[#E8E3DC] bg-white rounded-[11px] py-3 font-semibold text-[14px] text-[#2A241F] hover:border-[#D2CAC0] hover:bg-[#FDFCFA] transition-all normal-case",
    socialButtonsBlockButtonText: "font-semibold text-[14px]",
    socialButtonsProviderIcon: "w-[17px] h-[17px]",

    // Divider
    dividerRow: "my-[1.4rem]",
    dividerLine: "bg-[#EDE8E1]",
    dividerText: "text-[12px] text-[#A69C92] font-medium",

    // Form fields
    formFieldLabel: "text-[13px] font-semibold text-[#2A241F] mb-[7px]",
    formFieldInput:
      "w-full px-[14px] py-3 rounded-[11px] border border-[#E8E3DC] bg-white text-[14px] text-[#141210] placeholder:text-[#B8AFA3] focus:border-bonza focus:ring-[3px] focus:ring-bonza/[0.11] focus:outline-none transition-all",
    formFieldAction: "text-[12.5px] font-semibold text-bonza hover:text-bonza-dark",

    // Submit
    formButtonPrimary:
      "w-full py-[13px] rounded-[11px] bg-[#141210] text-white text-[14.5px] font-semibold hover:bg-[#332B25] transition-colors normal-case shadow-none",

    // Links and secondary text
    identityPreviewEditButton: "text-bonza font-semibold",
    formResendCodeLink: "text-bonza font-semibold",
    otpCodeFieldInput: "border-[#E8E3DC] rounded-[11px]",

    // Badges
    badge: "bg-[#F0ECE5] text-[#7A7269] text-[9.5px] font-bold rounded-[5px]",

    // Errors
    formFieldErrorText: "text-[12.5px] text-[#96450A] mt-1.5",
    alertText: "text-[13px] text-[#96450A]",
  },

  layout: {
    socialButtonsPlacement: "top",
    socialButtonsVariant: "blockButton",
    showOptionalFields: false,
    logoPlacement: "none", // AuthLayout renders the wordmark
    helpPageUrl: "/help",
    privacyPageUrl: "/privacy",
    termsPageUrl: "/terms",
  },
};
