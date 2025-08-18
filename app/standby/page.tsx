import Standby from "@/components/standby";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
export default function StandbyPage(){
    return(
        <main className="bg-[#ffffff]">
            <Navbar />
            <Standby />
            <Footer />
        </main>
    );
}