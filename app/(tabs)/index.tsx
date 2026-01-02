import { Redirect } from "expo-router";

export default function Home() {
  // Home ahora manda directo a la pantalla única de emergencia
  return <Redirect href="/emergencia" />;
}
  