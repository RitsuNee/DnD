"use client";

import { motion } from "framer-motion";
import BagOfHolding from "@/components/party/bag-of-holding";

export default function InventoryPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <BagOfHolding />
      </motion.div>
    </div>
  );
}
