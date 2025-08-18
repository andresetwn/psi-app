import Programmers from "@/components/programmer";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
export default function ProgrammersPage() {
    return(
    <main className="bg-[#ffffff]">
      <Navbar />
      <Programmers />
      <Footer />
    </main>
    );
}