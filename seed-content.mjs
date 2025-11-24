import { drizzle } from 'drizzle-orm/mysql2';
import { contentLibrary } from './drizzle/schema.ts';

const db = drizzle(process.env.DATABASE_URL);

const sampleContent = [
  {
    title: "The Science of Climate Change",
    author: "Environmental Research Team",
    originalText: `Climate change represents one of the most significant challenges facing humanity in the twenty-first century. The accumulation of greenhouse gases in the atmosphere, primarily carbon dioxide from fossil fuel combustion, has led to a measurable increase in global average temperatures. This warming trend has cascading effects on weather patterns, ocean currents, and ecosystems worldwide.

Scientists have documented melting ice caps, rising sea levels, and increasingly frequent extreme weather events. The scientific consensus is clear: human activities are the dominant cause of observed warming since the mid-twentieth century. The Intergovernmental Panel on Climate Change has concluded that limiting warming to 1.5 degrees Celsius above pre-industrial levels requires immediate and substantial reductions in greenhouse gas emissions.

The impacts of climate change are not evenly distributed. Vulnerable populations, particularly in developing nations, face disproportionate risks from sea-level rise, agricultural disruption, and water scarcity. Adaptation strategies must be implemented alongside mitigation efforts to protect communities already experiencing climate impacts.

Transitioning to renewable energy sources, improving energy efficiency, and developing carbon capture technologies are essential components of the global response. Individual actions, while important, must be complemented by systemic changes in policy, infrastructure, and economic incentives to achieve the necessary scale of transformation.`,
    baseDifficulty: 6,
    fleschKincaid: 12,
    wordCount: 189,
    category: "science"
  },
  {
    title: "The Adventures of Tom Sawyer (Excerpt)",
    author: "Mark Twain",
    originalText: `"Tom!"

No answer.

"TOM!"

No answer.

"What's gone with that boy, I wonder? You TOM!"

No answer.

The old lady pulled her spectacles down and looked over them about the room; then she put them up and looked out under them. She seldom or never looked through them for so small a thing as a boy; they were her state pair, the pride of her heart, and were built for "style," not service—she could have seen through a pair of stove-lids just as well. She looked perplexed for a moment, and then said, not fiercely, but still loud enough for the furniture to hear:

"Well, I lay if I get hold of you I'll—"

She did not finish, for by this time she was bending down and punching under the bed with the broom, and so she needed breath to punctuate the punches with. She resurrected nothing but the cat.

"I never did see the beat of that boy!"

She went to the open door and stood in it and looked out among the tomato vines and "jimpson" weeds that constituted the garden. No Tom. So she lifted up her voice at an angle calculated for distance and shouted:

"Y-o-u-u TOM!"`,
    baseDifficulty: 4,
    fleschKincaid: 8,
    wordCount: 195,
    category: "fiction"
  },
  {
    title: "The Water Cycle",
    author: "Science Education Series",
    originalText: `Water moves around Earth in a cycle. This cycle is called the water cycle. The sun heats water in rivers, lakes, and oceans. The water turns into vapor and rises into the air. This is called evaporation.

High in the sky, the water vapor cools down and turns back into tiny water drops. These drops form clouds. This process is called condensation. When the drops get big and heavy, they fall back to Earth as rain or snow. This is precipitation.

The rain and snow fall on land and flow into rivers and streams. The rivers carry the water back to the oceans. Then the cycle starts all over again. The water cycle is very important for all living things. Plants need water to grow. Animals need water to drink. People use water for many things like drinking, cooking, and cleaning.

Without the water cycle, there would be no fresh water on Earth. The same water keeps moving around and around. The water you drink today might have been in a cloud yesterday or in the ocean last week!`,
    baseDifficulty: 2,
    fleschKincaid: 4,
    wordCount: 180,
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
