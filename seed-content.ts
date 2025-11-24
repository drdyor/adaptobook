import { drizzle } from 'drizzle-orm/mysql2';
import { contentLibrary } from './drizzle/schema';

const db = drizzle(process.env.DATABASE_URL!);

const sampleContent = [
  {
    title: "The Science of Climate Change",
    author: "Environmental Research Team",
    originalText: `Climate change represents one of the most significant challenges facing humanity in the twenty-first century. The accumulation of greenhouse gases in the atmosphere, primarily carbon dioxide from fossil fuel combustion, has led to a measurable increase in global average temperatures. This warming trend has cascading effects on weather patterns, ocean currents, and ecosystems worldwide.

Scientists have documented melting ice caps, rising sea levels, and increasingly frequent extreme weather events. The scientific consensus is clear: human activities are the dominant cause of observed warming since the mid-twentieth century.`,
    baseDifficulty: 6,
    fleschKincaid: 12,
    wordCount: 89,
    category: "science"
  },
  {
    title: "The Adventures of Tom Sawyer (Excerpt)",
    author: "Mark Twain",
    originalText: `"Tom!" No answer. "TOM!" No answer. "What's gone with that boy, I wonder? You TOM!" The old lady pulled her spectacles down and looked over them about the room. She seldom or never looked through them for so small a thing as a boy. She looked perplexed for a moment, and then said, not fiercely, but still loud enough for the furniture to hear: "Well, I lay if I get hold of you I'll—" She did not finish, for by this time she was bending down and punching under the bed with the broom.`,
    baseDifficulty: 4,
    fleschKincaid: 8,
    wordCount: 102,
    category: "fiction"
  },
  {
    title: "The Water Cycle",
    author: "Science Education Series",
    originalText: `Water moves around Earth in a cycle. This cycle is called the water cycle. The sun heats water in rivers, lakes, and oceans. The water turns into vapor and rises into the air. This is called evaporation. High in the sky, the water vapor cools down and turns back into tiny water drops. These drops form clouds. This process is called condensation. When the drops get big and heavy, they fall back to Earth as rain or snow.`,
    baseDifficulty: 2,
    fleschKincaid: 4,
    wordCount: 96,
    category: "science"
  }
];

async function seed() {
  console.log('Seeding content library...');
  
  for (const content of sampleContent) {
    await db.insert(contentLibrary).values(content);
    console.log(`Added: ${content.title}`);
  }
  
  console.log('Seeding complete!');
  process.exit(0);
}

seed().catch(console.error);
