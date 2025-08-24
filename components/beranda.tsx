"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import type { Variants, Transition } from "framer-motion";

const springTrans: Transition = { type: "spring", stiffness: 260, damping: 24 };
const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const itemUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: springTrans },
};

export default function Hero() {
  return (
    <section className="mx-auto mt-8 max-w-5xl py-8">
      <motion.div
        className="relative overflow-hidden rounded-xl bg-gray-100"
        initial="hidden"
        animate="show"
      >
        <motion.div
          aria-hidden
          className="absolute inset-0"
          initial={{ scale: 1 }}
          animate={{ scale: 1.08 }}
          transition={{
            duration: 18,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        >
          <Image
            src="/bg.png"
            alt="bg"
            fill
            priority
            className="object-cover"
          />
        </motion.div>
        <div className="absolute inset-0 bg-black/40" />
        <motion.div
          className="relative z-10 flex h-[380px] md:h-[430px] flex-col items-center justify-center px-6 text-center text-white"
          variants={container}
          viewport={{ once: true }}
        >
          <motion.h1
            className="mb-4 text-3xl font-extrabold md:text-5xl"
            variants={itemUp}
          >
            <motion.span
              className="inline-block"
              animate={{ y: [0, -10, 0] }}
              transition={{
                duration: 2.8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              Kelola Data, Pekerjaan, dan Standby Programmer
            </motion.span>
          </motion.h1>

          <Link href="/programmer">
            <motion.button
              variants={itemUp}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-md bg-blue-600 px-6 py-3 font-semibold shadow-md hover:bg-blue-700 mt-4"
            >
              Kelola Data Programmer
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
