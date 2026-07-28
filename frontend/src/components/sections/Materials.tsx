import { motion } from 'framer-motion';
import { Section } from '@/components/ui/Section';
import { Eyebrow } from '@/components/ui/SectionHeading';
import { Reveal, RevealGroup, revealItem } from '@/components/ui/Reveal';
import { materials } from '@/lib/content';

function Column({
  label,
  items,
}: {
  label: string;
  items: { name: string; note: string }[];
}) {
  return (
    <div>
      <Reveal>
        <p className="eyebrow mb-6 text-ink-40">{label}</p>
      </Reveal>
      <RevealGroup className="flex flex-col" stagger={0.08}>
        {items.map((item) => (
          <motion.div key={item.name} variants={revealItem}>
            <div className="group flex items-baseline justify-between gap-4 border-t border-line py-4 transition-colors duration-300 hover:border-line-strong sm:gap-6 sm:py-5">
              <h3 className="font-display text-xl font-bold text-aubergine sm:text-2xl">{item.name}</h3>
              <p className="max-w-[11rem] text-right text-sm leading-snug text-ink-55 sm:max-w-[16rem]">
                {item.note}
              </p>
            </div>
          </motion.div>
        ))}
      </RevealGroup>
    </div>
  );
}

export default function Materials() {
  return (
    <Section id="materials" tone="canvas" ariaLabel="Materials and fabrication">
      <div className="mb-7 max-w-3xl sm:mb-14">
        <Reveal>
          <Eyebrow>{materials.eyebrow}</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="mt-4 text-display-md font-extrabold text-aubergine sm:mt-6">{materials.title}</h2>
        </Reveal>
      </div>
      <div className="grid gap-8 md:grid-cols-2 md:gap-20">
        <Column label="Materials" items={materials.materials} />
        <Column label="Fabrication" items={materials.fabrication} />
      </div>
    </Section>
  );
}
