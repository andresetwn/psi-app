import Navbar from "@/components/navbar";
import Beranda from "@/components/beranda";
import Footer from "@/components/footer";


export default function HomePage() {
  return (
    <main className="bg-[#ffffff]">
      <Navbar />
      <Beranda />
      <Footer />
    </main>
  );
}
