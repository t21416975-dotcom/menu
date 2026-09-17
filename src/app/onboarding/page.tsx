import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreateRestaurantForm } from "@/components/onboarding/create-restaurant-form";
import { getCurrentProfile, getOwnRestaurant } from "@/lib/dal";

export const metadata: Metadata = { title: "إنشاء مطعم" };

export default async function OnboardingPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const restaurant = await getOwnRestaurant();
  if (restaurant) redirect("/dashboard");

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-16">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold">لنُنشئ منيو مطعمك</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          خطوة واحدة وننقلك إلى لوحة التحكم. يمكنك تغيير كل شيء لاحقاً.
        </p>
      </div>

      <CreateRestaurantForm defaultName={profile.full_name ?? ""} />
    </main>
  );
}