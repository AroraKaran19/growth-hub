import { permanentRedirect } from "next/navigation";

export default function AdminTeam() {
  permanentRedirect("/admin/users/staff");
}
