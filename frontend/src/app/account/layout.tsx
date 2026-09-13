import AccountSidebar from "../(pages)/Account/components/AccountSidebar";

export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <div className="bg-secondary pb-20 pt-28 lg:pt-32">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-10 2xl:max-w-[1600px]">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
          <AccountSidebar />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}
