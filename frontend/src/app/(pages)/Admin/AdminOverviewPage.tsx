"use client";

import type { CSSProperties, ReactElement } from "react";
import BarChart, { formatValue } from "@/app/components/shared/BarChart";
import { OverviewSkeleton, RAISED_CARD, REVEAL, plural, revealDelay } from "@/app/components/shared/OverviewUi";
import { canAccessSection } from "@/config/adminPermissions";
import { useAdminOverview } from "@/hooks/useOverview";
import { useAdminSession } from "@/stores/admin";
import { cn } from "@/utils";
import { PartnerPageHeader as PageHeader } from "../Partner/components/PartnerUi";
import CustomerGrowth from "./components/overview/CustomerGrowth";
import { CheckoutsCard, CouponsCard, CustomersCard, MembershipsCard, VenuePerformanceCard } from "./components/overview/InsightCards";
import SalesBand from "./components/overview/SalesBand";
import TodoList from "./components/overview/TodoList";

const AdminOverviewPage = () => {
  const { account } = useAdminSession();
  const { overview, error, isLoading } = useAdminOverview();

  if (isLoading || !account) return <OverviewSkeleton />;

  const canOpen = (permission: string) => canAccessSection(account, permission);
  const header = <PageHeader title="Overview" description="What needs you first, then how Growth Hub is selling." />;

  if (!overview) {
    return (
      <>
        {header}
        <p role="alert" className="mt-6 rounded-2xl bg-tertiary/5 px-4 py-8 text-center text-sm text-tertiary/70">
          {error ? "We couldn't load the overview. Refresh to try again." : "Nothing to show yet."}
        </p>
      </>
    );
  }

  const { sales, checkouts, memberships, customers, coupons } = overview;
  const showVenues = canOpen("workspaces.venues");
  const cards = [
    memberships &&
      ((style: CSSProperties) => (
        <MembershipsCard
          key="memberships"
          style={style}
          memberships={memberships}
          link={canOpen("memberships.manage") ? "/admin/memberships" : null}
        />
      )),
    customers &&
      ((style: CSSProperties) => (
        <CustomersCard key="customers" style={style} customers={customers} link={canOpen("users.manage") ? "/admin/users" : null} />
      )),
    coupons &&
      ((style: CSSProperties) => (
        <CouponsCard key="coupons" style={style} coupons={coupons} link={canOpen("coupons") ? "/admin/coupons" : null} />
      )),
    showVenues && ((style: CSSProperties) => <VenuePerformanceCard key="venues" style={style} />),
  ].filter((card): card is (style: CSSProperties) => ReactElement => Boolean(card));

  return (
    <>
      {header}

      <div className="mt-6 flex flex-col gap-6">
        <TodoList todo={overview.todo} canOpen={canOpen} />

        {sales && <SalesBand sales={sales} />}

        {(sales || checkouts) && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {sales && (
              <div className={cn(REVEAL, checkouts ? "lg:col-span-2" : "lg:col-span-3")} style={revealDelay(2)}>
                <BarChart
                  title="Collected, last 30 days"
                  total={formatValue(sales.trend.reduce((sum, day) => sum + day.collected, 0), "money")}
                  className="h-full shadow-md shadow-tertiary/5"
                  series={sales.trend.map((day) => ({
                    label: day.date,
                    value: day.collected,
                    kind: "money",
                    note: `${plural(day.bookings, "booking")} made`,
                  }))}
                />
              </div>
            )}
            {checkouts && (
              <CheckoutsCard checkouts={checkouts} style={revealDelay(3)} />
            )}
          </div>
        )}

        {cards.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card, index) => card(revealDelay(4 + index)))}
          </div>
        )}

        {customers?.growth && <CustomerGrowth growth={customers.growth} style={revealDelay(4 + cards.length)} />}

        {!sales && !checkouts && cards.length === 0 && (
          <p className={cn(RAISED_CARD, "px-5 py-6 text-sm text-tertiary/60")}>
            Sales, memberships and customer numbers show here for admins with those sections. Ask a super admin if you need them.
          </p>
        )}
      </div>
    </>
  );
};

export default AdminOverviewPage;
