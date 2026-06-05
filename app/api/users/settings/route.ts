import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  return NextResponse.json(
    {
      notifications: {
        notificationSound: "chime",
        notificationVolume: 0.65,
        customNotificationSoundDataUrl: "",
        ringtone: "classic",
        ringtoneVolume: 0.75,
        customRingtoneDataUrl: "",
      },
      communication: {
        messageSettings: {
          ringtone: "classic",
          ringtoneVolume: 0.75,
        },
      },
    },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
