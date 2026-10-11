"use client";

import { PartnerPageHeader as PageHeader } from "../Partner/components/PartnerUi";
import { WorkspaceTypesEditor } from "./components/settings/CatalogueEditors";

const AdminWorkspaceTypesPage = () => (
  <>
    <PageHeader
      title="Workspace types"
      description="The four types are fixed. Change how each is named, described and pictured; it updates everywhere the type appears."
    />
    <div className="mt-6">
      <WorkspaceTypesEditor />
    </div>
  </>
);

export default AdminWorkspaceTypesPage;
