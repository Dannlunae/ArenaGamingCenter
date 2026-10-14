import { redirect } from "next/navigation";
import { sesion } from "@/lib/auth";
import Caja from "@/components/Caja";

export const dynamic = "force-dynamic";
export default async function Page() {
  if (!(await sesion())) redirect("/login");
  return <Caja />;
}
