import Pekerjaan from "@/components/pekerjaan";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
export default function PekerjaanPage() {
  return (
    <main className="bg-[#ffffff]">
      <Navbar />
      <Pekerjaan/>
      <Footer />
    </main>
  );
}
