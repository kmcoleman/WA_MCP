import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSV_PATH = join(__dirname, "campouts-review.csv");
const OUTPUT_PATH = join(__dirname, "campouts-geocoded.json");
const CACHE_PATH = join(__dirname, "geocode-cache.json");

// San Leandro reference point
const SAN_LEANDRO = { lat: 37.7249, lng: -122.1561 };

interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
  query: string;
}

interface CampoutRow {
  num: number;
  date: string;
  eventName: string;
  campoutLocation: string;
  breakfastLocation: string;
  cancelled: boolean;
  notes: string;
  campoutGeo: GeoResult | null;
  breakfastGeo: GeoResult | null;
  campoutDistMi: number | null;
  breakfastDistMi: number | null;
  campoutToBreakfastDistMi: number | null;
  campoutDurMin: number | null;
  breakfastDurMin: number | null;
  campoutToBreakfastDurMin: number | null;
}

// Load or init geocode cache
let cache: Record<string, GeoResult | "NOT_FOUND"> = {};
if (existsSync(CACHE_PATH)) {
  cache = JSON.parse(readFileSync(CACHE_PATH, "utf-8"));
}

function saveCache() {
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
}

// ========== KNOWN COORDINATES ==========
// Manually looked up coordinates for locations Nominatim can't find
const KNOWN_COORDS: Record<string, { lat: number; lng: number; name: string }> = {
  // Campgrounds
  "george hatfield group campsite": { lat: 37.4236, lng: -120.8541, name: "George Hatfield State Recreation Area, Hilmar, CA" },
  "furnace creek campground, death valley, ca": { lat: 36.4571, lng: -116.8654, name: "Furnace Creek Campground, Death Valley" },
  "gray pine group campground, stonyford, ca": { lat: 39.3774, lng: -122.5430, name: "Gray Pine Campground, Stonyford, CA" },
  "arroyo seco campground, greenfield, california": { lat: 36.2337, lng: -121.4879, name: "Arroyo Seco Campground, Greenfield, CA" },
  "arroyo seco campground, greenfield, ca": { lat: 36.2337, lng: -121.4879, name: "Arroyo Seco Campground, Greenfield, CA" },
  "fremont peak campground": { lat: 36.7597, lng: -121.5048, name: "Fremont Peak State Park, San Juan Bautista, CA" },
  "10700 san juan canyon rd, san juan bautista, ca 95045": { lat: 36.7597, lng: -121.5048, name: "Fremont Peak State Park, San Juan Bautista, CA" },
  "sugarloaf ridge state park, kenwood, ca": { lat: 38.4390, lng: -122.5104, name: "Sugarloaf Ridge State Park, Kenwood, CA" },
  "sugarloaf ridge state park, 2605 adobe canyon road, kenwood, ca": { lat: 38.4390, lng: -122.5104, name: "Sugarloaf Ridge State Park, Kenwood, CA" },
  "mt madonna park, 7850 pole line rd, watsonville, ca 95076": { lat: 36.9566, lng: -121.7187, name: "Mt Madonna Park, Watsonville, CA" },
  "mt madonna indian rock group site": { lat: 36.9566, lng: -121.7187, name: "Mt Madonna Park, Watsonville, CA" },
  "chanslor ranch, 2660 ca-1, bodega bay, ca": { lat: 38.3346, lng: -123.0501, name: "Chanslor Ranch, Bodega Bay, CA" },
  "nordheimer campground, forks of salmon, ca": { lat: 41.2305, lng: -123.0648, name: "Nordheimer Campground, Forks of Salmon, CA" },
  "lake alpine, arnold, ca": { lat: 38.4770, lng: -120.0092, name: "Lake Alpine, Arnold, CA" },
  "saddlebag lake, lee vining, ca": { lat: 37.9656, lng: -119.2721, name: "Saddlebag Lake, Lee Vining, CA" },
  "big basin redwoods state park, boulder creek, ca": { lat: 37.1744, lng: -122.2218, name: "Big Basin Redwoods State Park, Boulder Creek, CA" },
  "salt point state park, jenner, ca": { lat: 38.5676, lng: -123.3295, name: "Salt Point State Park, Jenner, CA" },
  "plaskett creek campground, big sur, ca": { lat: 35.9183, lng: -121.4729, name: "Plaskett Creek Campground, Big Sur, CA" },
  "5300 soda bay rd, kelseyville, ca 95451": { lat: 39.0029, lng: -122.8118, name: "Clear Lake State Park, Kelseyville, CA" },
  "songdog ranch-680 ballinger canyon rd, maricopa, ca 93252": { lat: 34.9403, lng: -119.5203, name: "Songdog Ranch, Maricopa, CA" },
  "680 ballinger cyn rd, off of hwy 33 in the cuyama valley of california.": { lat: 34.9403, lng: -119.5203, name: "Songdog Ranch, Maricopa, CA" },
  "loyalton rotary park-co rte s860, loyalton, ca 96118": { lat: 39.6753, lng: -120.2382, name: "Loyalton Rotary Park, Loyalton, CA" },
  "coyote group campground, french meadows reservoir, ca": { lat: 39.1044, lng: -120.4811, name: "Coyote Group Campground, French Meadows Reservoir, CA" },
  "cedar flat group campground, bishop, ca": { lat: 37.2968, lng: -118.5179, name: "Cedar Flat Group Campground, Bishop, CA" },
  "negro bar, folsom lake state recreation area, ca": { lat: 38.6463, lng: -121.1746, name: "Negro Bar, Folsom Lake SRA, CA" },
  "lake folsom state park-negro bar group site": { lat: 38.6463, lng: -121.1746, name: "Negro Bar, Folsom Lake SRA, CA" },
  "spicer reservoir, arnold, ca": { lat: 38.3987, lng: -119.9944, name: "Spicer Reservoir, Arnold, CA" },
  "pioneer trail group campground, arnold, ca": { lat: 38.4590, lng: -120.3519, name: "Pioneer Trail Group Campground, Arnold, CA" },
  "chinquapin group campground, cave junction, or": { lat: 42.1629, lng: -123.6478, name: "Chinquapin Group Campground, Cave Junction, OR" },
  "napa valley bothe state park": { lat: 38.5405, lng: -122.5484, name: "Bothe-Napa Valley State Park, CA" },
  "las cruces rd., la grange ca": { lat: 37.6628, lng: -120.4611, name: "La Grange, CA" },
  "15630 wentworth springs road, georgetown, ca 95634": { lat: 38.9552, lng: -120.3044, name: "Uncle Tom's Cabin, Georgetown, CA" },
  "15630 wentworth springs rd, pollock pines, ca 95726": { lat: 38.9552, lng: -120.3044, name: "Uncle Tom's Cabin, Georgetown, CA" },
  "42601 bear river road, pioneer, california 95666, united states": { lat: 38.4553, lng: -120.5461, name: "Bear River Group Campground, Pioneer, CA" },
  "badger flat group campground, sequoia national forest, ca": { lat: 35.8447, lng: -118.5917, name: "Badger Flat Campground, Sequoia NF, CA" },
  "mammoth lakes, ca": { lat: 37.6485, lng: -118.9721, name: "Mammoth Lakes, CA" },
  "hornswoggle group campground, camptonville, ca": { lat: 39.4463, lng: -121.0401, name: "Hornswoggle Campground, Camptonville, CA" },
  "manchester beach koa, manchester, ca": { lat: 38.9723, lng: -123.6862, name: "Manchester Beach KOA, Manchester, CA" },
  "lost creek group campground, lassen volcanic np, ca": { lat: 40.4658, lng: -121.5371, name: "Lost Creek Group Camp, Lassen Volcanic NP, CA" },
  "kirch flat campground, los padres national forest, ca": { lat: 36.0904, lng: -121.5795, name: "Kirch Flat Campground, Los Padres NF, CA" },
  "lake pillsbury, mendocino national forest, ca": { lat: 39.4212, lng: -122.9564, name: "Lake Pillsbury, Mendocino NF, CA" },
  "codorniz recreation area, eastman lake, raymond, ca": { lat: 37.1887, lng: -119.9750, name: "Codorniz Recreation Area, Eastman Lake, CA" },
  "mcconnell state recreation area, ballico, ca": { lat: 37.5614, lng: -120.8222, name: "McConnell State Recreation Area, Ballico, CA" },
  "cottonwood springs campground, beckwourth, ca": { lat: 39.8193, lng: -120.3738, name: "Cottonwood Springs Campground, Beckwourth, CA" },
  "gray pine group campground, stonyford, ca": { lat: 39.3774, lng: -122.5430, name: "Gray Pine Campground, Stonyford, CA" },
  "quaking aspen group campsite": { lat: 36.1219, lng: -118.5327, name: "Quaking Aspen Campground, Sequoia NF, CA" },
  "big meadow campground, arnold, ca 95223": { lat: 38.4428, lng: -120.1068, name: "Big Meadow Campground, Arnold, CA" },
  "7589 reynolds ferry rd, sonora, ca 95370": { lat: 37.8999, lng: -120.5241, name: "Tuttletown Recreation Area, Sonora, CA" },
  "clearlake state park, kelseyville, ca": { lat: 39.0029, lng: -122.8118, name: "Clear Lake State Park, Kelseyville, CA" },
  "death valley np": { lat: 36.4571, lng: -116.8654, name: "Death Valley NP (Furnace Creek)" },
  "las cruces rd., la grange ca": { lat: 37.6628, lng: -120.4611, name: "La Grange, CA" },

  // Breakfast spots
  "ranch house cafe, 1012 school st, moraga, ca 94556": { lat: 37.8346, lng: -122.1297, name: "Ranch House Cafe, Moraga, CA" },
  "denny's, 260 pittman rd, fairfield, ca 94534": { lat: 38.2461, lng: -122.0528, name: "Denny's, Fairfield, CA" },
  "adventure designs, 6998 sierra ct suite b dublin, ca 94568": { lat: 37.7025, lng: -121.9365, name: "Adventure Designs, Dublin, CA" },
  "scramblz 775 east dunne avenue, morgan hill, ca 95037": { lat: 37.1302, lng: -121.6430, name: "Scramblz, Morgan Hill, CA" },
  "black bear diner, 700 bancroft rd, walnut creek, ca": { lat: 37.9039, lng: -122.0605, name: "Black Bear Diner, Walnut Creek, CA" },
  "black bear diner 700 bancroft road, walnut creek": { lat: 37.9039, lng: -122.0605, name: "Black Bear Diner, Walnut Creek, CA" },
  "black bear diner, 5035 mowry ave. fremont, 94538": { lat: 37.5492, lng: -122.0005, name: "Black Bear Diner, Fremont, CA" },
  "black bear diner, 1530 e main st, woodland, ca 95776": { lat: 38.6754, lng: -121.7498, name: "Black Bear Diner, Woodland, CA" },
  "eduardo's restaurant, 4200 redwood hwy, san rafael": { lat: 37.9558, lng: -122.5286, name: "Eduardo's Restaurant, San Rafael, CA" },
  "jim's country style, 5400 sunol blvd. pleasanton": { lat: 37.6268, lng: -121.8841, name: "Jim's Country Style, Pleasanton, CA" },
  "cowboy's corner cafe, 946 main street, watsonville": { lat: 36.9108, lng: -121.7569, name: "Cowboy's Corner Cafe, Watsonville, CA" },
  "country waffles, 1803 holmes st., livermore, ca 94551": { lat: 37.6765, lng: -121.7743, name: "Country Waffles, Livermore, CA" },
  "black bear diner 4927 junipero serra blvd, colma, ca 94014": { lat: 37.6713, lng: -122.4529, name: "Black Bear Diner, Colma, CA" },
  "napa black bear diner, 303 soscol ave., napa, ca": { lat: 38.2879, lng: -122.2758, name: "Black Bear Diner, Napa, CA" },
  "squeeze in 3020 floyd ave #101": { lat: 37.6368, lng: -121.0061, name: "Squeeze In, Modesto, CA" },
  "squeeze in 3020 floyd ave #101, modesto": { lat: 37.6368, lng: -121.0061, name: "Squeeze In, Modesto, CA" },
  "black bear diner in manteca": { lat: 37.8019, lng: -121.2139, name: "Black Bear Diner, Manteca, CA" },
  "1703 e yosemite ave for breakfast": { lat: 37.8019, lng: -121.2139, name: "Black Bear Diner, Manteca, CA" },
  "huckleberry's at 3101 travis blvd b in fairfield": { lat: 38.2647, lng: -122.0078, name: "Huckleberry's, Fairfield, CA" },
  "huckleberry's in fairfield": { lat: 38.2647, lng: -122.0078, name: "Huckleberry's, Fairfield, CA" },
  "huckleberry's breakfast and lunch in fairfield at 3101 travis blvd b": { lat: 38.2647, lng: -122.0078, name: "Huckleberry's, Fairfield, CA" },
  "huckleberry's , 2071 camden ave": { lat: 37.2497, lng: -121.9321, name: "Huckleberry's, San Jose, CA" },
  "black bear diner in vacaville": { lat: 38.3476, lng: -121.9970, name: "Black Bear Diner, Vacaville, CA" },
  "black bear diner, oakley": { lat: 37.9874, lng: -121.7128, name: "Black Bear Diner, Oakley, CA" },
  "black bear diner 3201 main st, oakley, ca 94561": { lat: 37.9874, lng: -121.7128, name: "Black Bear Diner, Oakley, CA" },
  "canyon café in american canyon 3845 broadway, american canyon, ca 94503": { lat: 38.1694, lng: -122.2567, name: "Canyon Café, American Canyon, CA" },
  "sharp park golf course restaurant": { lat: 37.6270, lng: -122.4860, name: "Sharp Park Golf Course, Pacifica, CA" },
  "hwy 12 diner in rio vista": { lat: 38.1699, lng: -121.6920, name: "Hwy 12 Diner, Rio Vista, CA" },
  "black bear diner in gilroy at 395 leavesley rd": { lat: 37.0157, lng: -121.5774, name: "Black Bear Diner, Gilroy, CA" },
  "bayside cafe, 1 gate 6 road, sausalito": { lat: 37.8587, lng: -122.4859, name: "Bayside Cafe, Sausalito, CA" },
  "bmw motorcycles of san jose, ca": { lat: 37.2694, lng: -121.8218, name: "BMW Motorcycles of San Jose, CA" },
  "980 admiral callaghan ln, vallejo, ca 94591": { lat: 38.1147, lng: -122.2283, name: "Vallejo, CA" },
  "wizard's café": { lat: 36.8508, lng: -121.4016, name: "Wizard's Café at Corbin, Hollister, CA" },
  "babs' delta diner (770 kellogg street": { lat: 38.2386, lng: -122.0399, name: "Babs' Delta Diner, Suisun City, CA" },
  "the velvet grill and creamery (2204 mchenry ave": { lat: 37.6466, lng: -120.9823, name: "Velvet Grill & Creamery, Modesto, CA" },
  "black bear diner, 287 e covell blvd, davis, ca 95616": { lat: 38.5563, lng: -121.7393, name: "Black Bear Diner, Davis, CA" },
  "flapjacks breakfast & grill 6881 airline hwy breakfast: 8:00 am kickstands up: 9:00 am": { lat: 36.7478, lng: -119.7121, name: "FlapJacks, Hollister, CA" },
  "buck's restaurant in woodside": { lat: 37.4297, lng: -122.2536, name: "Buck's Restaurant, Woodside, CA" },
  "8800 mcconnell rd, ballico, ca 95303": { lat: 37.5614, lng: -120.8222, name: "McConnell State Rec Area, Ballico, CA" },
  "roseville": { lat: 38.7521, lng: -121.2880, name: "Roseville, CA" },
  "breakfast jim's country style, pleasanton": { lat: 37.6268, lng: -121.8841, name: "Jim's Country Style, Pleasanton, CA" },
  "mimi's cafe (1650 gateway blvd, fairfield)": { lat: 38.2615, lng: -122.0217, name: "Mimi's Cafe, Fairfield, CA" },
  "omelet house in stockton": { lat: 37.9577, lng: -121.2908, name: "Omelet House, Stockton, CA" },
  // FlapJacks in Hollister - corrected
  "flapjacks breakfast & grill 6881 airline hwy": { lat: 36.8470, lng: -121.4061, name: "FlapJacks, Hollister, CA" },

  // #78 is Stop the Bleed, not a campout
  "751 s. bascom ave., building q, room 160 san jose": { lat: 37.3117, lng: -121.9316, name: "751 S Bascom Ave, San Jose, CA" },

  // #4 Rancho Seco - should be near Sacramento, not Kern County
  "rancho seco, california": { lat: 38.3448, lng: -121.1200, name: "Rancho Seco Recreation Area, Herald, CA" },

  // Additional failures from first run
  "death valley at the furnace creek campground": { lat: 36.4571, lng: -116.8654, name: "Furnace Creek Campground, Death Valley" },
  "grover hot springs state park, markleeville, ca": { lat: 38.6966, lng: -119.8414, name: "Grover Hot Springs SP, Markleeville, CA" },
  "black bear diner, 700 bancroft ave": { lat: 37.9039, lng: -122.0605, name: "Black Bear Diner, Walnut Creek, CA" },
  "black bear diner, 700 bancroft ave. walnut creek": { lat: 37.9039, lng: -122.0605, name: "Black Bear Diner, Walnut Creek, CA" },
  "black bear diner, 700 bancroft rd, walnut creek, ca, or sam's play for cafe, 2630 cleveland ave, santa rosa, ca": { lat: 37.9039, lng: -122.0605, name: "Black Bear Diner, Walnut Creek, CA (or Sam's, Santa Rosa)" },
  "back at liberty glen campground": { lat: 38.3448, lng: -121.1200, name: "Liberty Glen Campground, Rancho Seco, CA" },
  "plaskett creek, plus wunderlich america open house": { lat: 35.9183, lng: -121.4729, name: "Plaskett Creek Campground, Big Sur, CA" },
  "salt point sp plus bmw santa rosa open house": { lat: 38.5676, lng: -123.3295, name: "Salt Point State Park, CA" },
  "songdog ranch": { lat: 34.9403, lng: -119.5203, name: "Songdog Ranch, Maricopa, CA" },
  "finnon lake campground, 9100 rock creek road, placerville, ca.": { lat: 38.7263, lng: -120.7759, name: "Finnon Lake, Placerville, CA" },
  "trinity lake blvd, lewiston, ca 96052 - off hwy 3": { lat: 40.7218, lng: -122.5448, name: "Trinity Lake, Lewiston, CA" },
  "jensen's restaurant, 1550 n lover's ln": { lat: 39.1555, lng: -123.2044, name: "Jensen's Restaurant, Ukiah, CA" },
  "adel's in healdsburg and": { lat: 38.6113, lng: -122.8690, name: "Adel's, Healdsburg, CA" },
  "suisun city black bear diner starting at 8,": { lat: 38.2441, lng: -122.0186, name: "Black Bear Diner, Suisun City, CA" },
  "black bear diner in suisun - 8:00 am, ride departs at 9:00 am": { lat: 38.2441, lng: -122.0186, name: "Black Bear Diner, Suisun City, CA" },
  "black bear diner in suisun": { lat: 38.2441, lng: -122.0186, name: "Black Bear Diner, Suisun City, CA" },
  "indian rock group site at the mt madonna park above watsonville": { lat: 36.9566, lng: -121.7187, name: "Mt Madonna Park, Watsonville, CA" },
  "wizard's café , located at the corbin custom seat factory in hollister": { lat: 36.8508, lng: -121.4016, name: "Wizard's Café at Corbin, Hollister, CA" },
  "babs' delta diner (770 kellogg street, suisun)": { lat: 38.2386, lng: -122.0399, name: "Babs' Delta Diner, Suisun City, CA" },
  "velvet grill and creamery (2204 mchenry ave, modesto)": { lat: 37.6466, lng: -120.9823, name: "Velvet Grill & Creamery, Modesto, CA" },
  "buck's restaurant in woodside, a silicon valley institution for a hearty": { lat: 37.4297, lng: -122.2536, name: "Buck's Restaurant, Woodside, CA" },
  "huckleberry's , 2071 camden ave, san jose, ca 95124": { lat: 37.2497, lng: -121.9321, name: "Huckleberry's, San Jose, CA" },
  "bmw motorcycles of san jose at 9 am": { lat: 37.2694, lng: -121.8218, name: "BMW Motorcycles of San Jose, CA" },
  "mimi's cafe (1650 gateway blvd, fairfield) and a short rider briefing before heading north": { lat: 38.2615, lng: -122.0217, name: "Mimi's Cafe, Fairfield, CA" },
  "stan's maple in ukiah": { lat: 39.1510, lng: -123.2030, name: "Stan's Maple, Ukiah, CA" },
  "salt point group campsite": { lat: 38.5676, lng: -123.3295, name: "Salt Point State Park, CA" },
  "manteca, ca 95336": { lat: 37.7974, lng: -121.2161, name: "Manteca, CA" },
  "recreation point, bass lake, ca": { lat: 37.3233, lng: -119.5609, name: "Recreation Point, Bass Lake, CA" },
  "timber creek group site, ely, nv": { lat: 39.2472, lng: -114.8886, name: "Timber Creek Campground, Ely, NV" },
  "omelet house, stockton, ca": { lat: 37.9577, lng: -121.2908, name: "Omelet House, Stockton, CA" },
  "black bear diner, manteca": { lat: 37.8019, lng: -121.2139, name: "Black Bear Diner, Manteca, CA" },
  "bmw motorcycles of san jose": { lat: 37.2694, lng: -121.8218, name: "BMW Motorcycles of San Jose, CA" },
  "suisun city black bear diner starting": { lat: 38.2441, lng: -122.0186, name: "Black Bear Diner, Suisun City, CA" },
  "omelet house in stockton ,": { lat: 37.9577, lng: -121.2908, name: "Omelet House, Stockton, CA" },
  "dealership": { lat: 37.6268, lng: -121.8841, name: "Pleasanton Black Bear Diner (assumed), CA" },
  "17645 ca-160, rio vista, ca 94571": { lat: 38.1563, lng: -121.6894, name: "Brannan Island SRA, Rio Vista, CA" },
  "980 admiral callaghan ln, vallejo, ca 94591": { lat: 38.1147, lng: -122.2283, name: "980 Admiral Callaghan Ln, Vallejo, CA" },
  "5400 sunol blvd, pleasanton, ca 94566": { lat: 37.6268, lng: -121.8841, name: "Jim's Country Style, Pleasanton, CA" },
  "303 soscol ave, napa, ca 94559": { lat: 38.2879, lng: -122.2758, name: "Black Bear Diner, Napa, CA" },
  "black bear diner, 303 soscol ave, napa, ca": { lat: 38.2879, lng: -122.2758, name: "Black Bear Diner, Napa, CA" },
  "country inn cafe, 6484 camden ave, san jose, ca 95120": { lat: 37.2350, lng: -121.8976, name: "Country Inn Cafe, San Jose, CA" },
  "8253 las cruces way, la grange, ca": { lat: 37.6628, lng: -120.4611, name: "La Grange, CA" },
  "111 sunset ave, suisun city, ca 94585": { lat: 38.2385, lng: -122.0341, name: "Black Bear Diner, Suisun City, CA" },
  "recreation point group campground, bass lake": { lat: 37.3283, lng: -119.5788, name: "Recreation Point, Bass Lake, CA" },
  "black bear diner, 700 bancroft ave, walnut creek, ca": { lat: 37.9039, lng: -122.0605, name: "Black Bear Diner, Walnut Creek, CA" },
  "black bear diner, 1530 e main st, woodland, ca 95776": { lat: 38.6754, lng: -121.7498, name: "Black Bear Diner, Woodland, CA" },
  "china camp, 101 peacock gap trail, san rafael, ca 94901": { lat: 37.9983, lng: -122.4685, name: "China Camp SP, San Rafael, CA" },
  "bayside cafe, 1 gate 6 rd, sausalito, ca 94965": { lat: 37.8587, lng: -122.4859, name: "Bayside Cafe, Sausalito, CA" },
  "big basin redwoods state park, boulder creek, ca": { lat: 37.1744, lng: -122.2218, name: "Big Basin Redwoods SP, Boulder Creek, CA" },
  "black bear diner, 4927 junipero serra blvd, colma, ca": { lat: 37.6713, lng: -122.4529, name: "Black Bear Diner, Colma, CA" },
  "starbucks, mowry ave, fremont, ca": { lat: 37.5527, lng: -121.9825, name: "Starbucks, Mowry Ave, Fremont, CA" },
  "black bear diner, 2347 w kettleman ln, lodi, ca 95242": { lat: 38.1188, lng: -121.2946, name: "Black Bear Diner, Lodi, CA" },
  "squeeze in, 3020 floyd ave #101, modesto, ca 95355": { lat: 37.6368, lng: -121.0061, name: "Squeeze In, Modesto, CA" },
  "32175 rd 29, raymond, ca 93653": { lat: 37.1887, lng: -119.9750, name: "Codorniz Recreation Area, Eastman Lake, CA" },
  "toby's restaurant, 1820 alum rock ave, san jose, ca": { lat: 37.3660, lng: -121.8340, name: "Toby's Restaurant, San Jose, CA" },
};

function lookupKnown(query: string): GeoResult | null {
  const lower = query.toLowerCase().trim();
  const match = KNOWN_COORDS[lower];
  if (match) {
    return { lat: match.lat, lng: match.lng, displayName: match.name, query };
  }
  return null;
}

// Clean up a location string to make it geocodable
function cleanLocation(raw: string): string {
  if (!raw || raw.trim() === "") return "";
  let loc = raw.trim();

  // Strip common prefixes
  loc = loc.replace(/^(Member Meeting\s*[-–—]\s*)/i, "");
  loc = loc.replace(/^(New August Campout\s*[-–—]\s*)/i, "");
  loc = loc.replace(/^(Moved to .+[-–—]\s*See other Event)/i, "");
  loc = loc.replace(/^(CANCELLED[^!]*!?\s*See[^:]*:\s*)/i, "");
  loc = loc.replace(/^(Cancelled\s+\w+\s+\d{4}\s+Club Meeting\s*[-–—]\s*)/i, "");
  loc = loc.replace(/^(Oktoberfest\s+(Meeting|General Meeting)\s+(&|and)\s+Campout\s*[-–—,]\s*)/i, "");
  loc = loc.replace(/^(See you in )/i, "");
  loc = loc.replace(/^(Pianetta Winery Vineyard, Meeting & Campout, )/i, "Pianetta Winery, ");

  // If it contains long description text, try to extract location
  if (/^(Breakfast|Due to|We will meet|We have|Sorry folks|Instead we|Registration|Considering|Happy 2020|California is|Get ready|Camp directions|Start location|Saturday Morning|Given the|Lets try|The breakfast|The club ride|The Group ride|☕|Our Group|McConnel State|Also we plan|Join us|Starts with|8:00 AM|We'll meet|We kick|We are meeting|September will|It may be|00 AM)/i.test(loc)) {
    // Try to extract "at [Location]" pattern
    const atMatch = loc.match(/(?:breakfast (?:is )?at|at|starts? at|meet (?:at|for breakfast at)|meet for breakfast at)\s+(?:the\s+)?([A-Z][^,.]+(?:,\s*[^,.]+)*(?:,\s*CA\s*\d{5})?)/i);
    if (atMatch) {
      let extracted = atMatch[1].trim();
      // Cut off at sentence boundaries
      extracted = extracted.split(/\.\s|!\s|\bPlease\b|\bArrive\b|\bBreakfast\b|\bThe ride\b|\bWe\b|\bBe gassed\b|\bKSU\b|\bKickstands\b|\bFill up\b|\bthen\b/i)[0].trim();
      // Remove trailing punctuation and time references
      extracted = extracted.replace(/[.!]+$/, "").trim();
      extracted = extracted.replace(/\s+at\s+\d+.*$/i, "").trim();
      extracted = extracted.replace(/\s+starting\s+at\s+\d+.*$/i, "").trim();
      extracted = extracted.replace(/\s+-\s+\d+.*$/i, "").trim();
      if (extracted.length > 5 && extracted.length < 150) return extracted;
    }
    return "";
  }

  // If text is very long (>200 chars), try to extract location
  if (loc.length > 200) {
    const streetMatch = loc.match(/(\d+\s+[A-Z][a-zA-Z\s]+(?:Ave|Blvd|St|Rd|Dr|Ln|Way|Hwy|Ct|Road|Street|Avenue|Boulevard|Lane|Drive|Court)[.,]?\s*(?:[A-Z][a-zA-Z\s]+,\s*)?(?:CA\s*\d{5})?)/i);
    if (streetMatch) return streetMatch[1].trim();
    const firstClause = loc.split(/[.!]|\bWe\b|\bThe\b|\bPlease\b/)[0].trim();
    if (firstClause.length < 150) return firstClause;
    return "";
  }

  loc = loc.replace(/!+$/, "").trim();
  return loc;
}

// Known location name mappings (raw -> cleaned)
const KNOWN_LOCATIONS: Record<string, string> = {
  "Death Valley": "Furnace Creek Campground, Death Valley, CA",
  "death valley np": "Furnace Creek Campground, Death Valley, CA",
  "Furance Creek Campground": "Furnace Creek Campground, Death Valley, CA",
  "Furance Creek Campground-Death Valley": "Furnace Creek Campground, Death Valley, CA",
  "Furnace Creek Campground Group sites 3-4": "Furnace Creek Campground, Death Valley, CA",
  "Furnace Greek Campground, Group Sites 3,4": "Furnace Creek Campground, Death Valley, CA",
  "Salt Point  Warren group campground": "Salt Point State Park, Jenner, CA",
  "Salt Point State Park, Jenner CA": "Salt Point State Park, Jenner, CA",
  "Nordheimer Campground - Forks of the Salmon Group Site Achiles": "Nordheimer Campground, Forks of Salmon, CA",
  "Nordheimer Group Campground": "Nordheimer Campground, Forks of Salmon, CA",
  "Grover Hot Springs": "Grover Hot Springs State Park, Markleeville, CA",
  "Mammoth Lakes member meeting and campout": "Mammoth Lakes, CA",
  "Mammoth Lakes, CA 93546": "Mammoth Lakes, CA",
  "Hat Creek Campground": "Hat Creek Campground, Old Station, CA",
  "Hat Creek, Old Satation, CA, Lassen National Forest": "Hat Creek Campground, Old Station, CA",
  "San Luis Reservoir State Recreational Area": "San Luis Reservoir State Recreation Area, CA",
  "Brannan Island State Recreation Area": "Brannan Island State Recreation Area, Rio Vista, CA",
  "Sopiago Springs": "Spicer Reservoir, Arnold, CA",
  "Soppiago Springs": "Spicer Reservoir, Arnold, CA",
  "Pioneer Trail Group Campground": "Pioneer Trail Group Campground, Arnold, CA",
  "Badger Flats Group": "Badger Flat Group Campground, Sequoia National Forest, CA",
  "Lassen NP-Lost Creek Group Site": "Lost Creek Group Campground, Lassen Volcanic NP, CA",
  "Kirch Flat Group Campsite": "Kirch Flat Campground, Los Padres National Forest, CA",
  "Manchester KOA Campground": "Manchester Beach KOA, Manchester, CA",
  "Manchester, CA": "Manchester Beach KOA, Manchester, CA",
  "Cedar Flat Group Sites Ferguson and Noren": "Cedar Flat Group Campground, Bishop, CA",
  "Cedar Flat group campground": "Cedar Flat Group Campground, Bishop, CA",
  "Coyote Group Campground-French Meadows Resevior": "Coyote Group Campground, French Meadows Reservoir, CA",
  "Codornize Recreation area-Raymond": "Codorniz Recreation Area, Eastman Lake, Raymond, CA",
  "Codorniz Recreation Area Campgropund NGB - Eastman Lake.": "Codorniz Recreation Area, Eastman Lake, Raymond, CA",
  "Grey Pine Group Site-Stoneyford Springs Group Site": "Gray Pine Group Campground, Stonyford, CA",
  "Gray Pine Campground, Stonyford, CA": "Gray Pine Group Campground, Stonyford, CA",
  "McConnell State Rec Area": "McConnell State Recreation Area, Ballico, CA",
  "Cottonwood Springs Group Site Bechwourth, CA": "Cottonwood Springs Campground, Beckwourth, CA",
  "Arroyo Seco Group Site": "Arroyo Seco Campground, Greenfield, CA",
  "Uncle Toms Cabin-15630 Wentworth Springs Rd, Pollock Pines, CA 95726": "15630 Wentworth Springs Rd, Pollock Pines, CA 95726",
  "15630 Wentworth Springs Road, Georgetown, CA 95634": "15630 Wentworth Springs Road, Georgetown, CA 95634",
  "Lake Folsom State Park-Negro Bar Group Site": "Negro Bar, Folsom Lake State Recreation Area, CA",
  "Saddlebag Lake Trailhead Group Site": "Saddlebag Lake, Lee Vining, CA",
  "Hornswaggle Group Site #3 (Manzanita) off Marysville Rd.": "Hornswoggle Group Campground, Camptonville, CA",
  "Near Camptonville, CA": "Hornswoggle Group Campground, Camptonville, CA",
  "Big Basin Redwoods Stape Park - Sequoia Group site 1": "Big Basin Redwoods State Park, Boulder Creek, CA",
  "Chanslor Ranch, 2660 CA-1, Bodega Bay": "Chanslor Ranch, 2660 CA-1, Bodega Bay, CA",
  "Lake Pillsbury": "Lake Pillsbury, Mendocino National Forest, CA",
  "Lodgepole Group Site, Lake Alpine": "Lake Alpine, Arnold, CA",
  "Recreation Point, Bass Lake": "Recreation Point, Bass Lake, CA",
  "BMW Motorycles of San Jose": "BMW Motorcycles of San Jose, CA",
  "Plaskett Creek, Hwy 1 Big Sur": "Plaskett Creek Campground, Big Sur, CA",
  "Sugarloaf Ridge State Park, Kenwood CA": "Sugarloaf Ridge State Park, Kenwood, CA",
  "Furnace Creek, Death Valley NP": "Furnace Creek Campground, Death Valley, CA",
  "Fremont Peak campground": "Fremont Peak Campground",
  "Chinquapin Group Campground,": "Chinquapin Group Campground, Cave Junction, OR",
};

function applyKnownLocation(loc: string): string {
  if (KNOWN_LOCATIONS[loc]) return KNOWN_LOCATIONS[loc];
  const lower = loc.toLowerCase();
  for (const [key, val] of Object.entries(KNOWN_LOCATIONS)) {
    if (key.toLowerCase() === lower) return val;
  }
  return loc;
}

// Haversine distance in miles (fallback)
function haversineDistMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Driving distance cache
const ROUTE_CACHE_PATH = join(__dirname, "route-cache.json");
let routeCache: Record<string, { distMi: number; durationMin: number } | "NO_ROUTE"> = {};
if (existsSync(ROUTE_CACHE_PATH)) {
  routeCache = JSON.parse(readFileSync(ROUTE_CACHE_PATH, "utf-8"));
}
function saveRouteCache() {
  writeFileSync(ROUTE_CACHE_PATH, JSON.stringify(routeCache, null, 2));
}

// OSRM driving distance using OpenStreetMap data
async function drivingDistMi(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): Promise<{ distMi: number; durationMin: number } | null> {
  const key = `${lat1},${lng1}->${lat2},${lng2}`;
  if (routeCache[key]) {
    if (routeCache[key] === "NO_ROUTE") return null;
    return routeCache[key] as { distMi: number; durationMin: number };
  }

  // Rate limit: 1 req/sec for OSRM demo server
  await new Promise((r) => setTimeout(r, 1100));

  const url = `https://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?overview=false`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "CampoutGeocoder/1.0 (personal project)" },
    });
    const data = await res.json();
    if (data.code === "Ok" && data.routes?.length > 0) {
      const route = data.routes[0];
      const result = {
        distMi: Math.round(route.distance * 0.000621371), // meters to miles
        durationMin: Math.round(route.duration / 60),       // seconds to minutes
      };
      routeCache[key] = result;
      saveRouteCache();
      return result;
    }
  } catch (e) {
    console.error(`  OSRM error:`, e);
  }

  routeCache[key] = "NO_ROUTE";
  saveRouteCache();
  return null;
}

// Rate-limited geocode using Nominatim (fallback after known coords)
async function geocodeNominatim(query: string): Promise<GeoResult | null> {
  if (cache[query]) {
    if (cache[query] === "NOT_FOUND") return null;
    return cache[query] as GeoResult;
  }

  await new Promise((r) => setTimeout(r, 1100));

  const url = `https://nominatim.openstreetmap.org/search?` +
    new URLSearchParams({ q: query, format: "json", limit: "1", countrycodes: "us" });

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "CampoutGeocoder/1.0 (personal project)" },
    });
    const data = await res.json();
    if (data.length > 0) {
      const result: GeoResult = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name,
        query,
      };
      cache[query] = result;
      saveCache();
      return result;
    }
  } catch (e) {
    console.error(`  Geocode error for "${query}":`, e);
  }

  cache[query] = "NOT_FOUND";
  saveCache();
  return null;
}

// Main geocode function: try known coords first, then Nominatim
async function geocode(query: string): Promise<GeoResult | null> {
  // Try known coordinates first
  const known = lookupKnown(query);
  if (known) return known;

  // Try Nominatim
  return geocodeNominatim(query);
}

// Parse CSV
function parseCSV(csvText: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    if (inQuotes) {
      if (ch === '"' && csvText[i + 1] === '"') { current += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { current += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ",") { row.push(current); current = ""; }
      else if (ch === "\n" || (ch === "\r" && csvText[i + 1] === "\n")) {
        row.push(current); current = ""; rows.push(row); row = [];
        if (ch === "\r") i++;
      } else { current += ch; }
    }
  }
  if (current || row.length > 0) { row.push(current); rows.push(row); }
  return rows;
}

async function main() {
  const csvText = readFileSync(CSV_PATH, "utf-8");
  const rows = parseCSV(csvText);
  const dataRows = rows.slice(1).filter((r) => r.length >= 4);

  console.log(`Loaded ${dataRows.length} campout records`);

  const results: CampoutRow[] = [];
  let geocodeSuccess = 0;
  let geocodeTotal = 0;
  const failures: { num: number; field: string; raw: string; cleaned: string }[] = [];

  for (const row of dataRows) {
    const num = parseInt(row[0]);
    const date = row[1];
    const eventName = row[2];
    const rawCampout = row[3] || "";
    const rawBreakfast = row[4] || "";
    const cancelled = (row[5] || "").toUpperCase() === "YES";
    const notes = row[6] || "";

    let cleanedCampout = cleanLocation(rawCampout);
    cleanedCampout = applyKnownLocation(cleanedCampout);

    let cleanedBreakfast = cleanLocation(rawBreakfast);
    cleanedBreakfast = applyKnownLocation(cleanedBreakfast);

    console.log(`\n[${num}] ${date} - ${eventName.substring(0, 60)}`);
    if (cancelled) {
      console.log("  CANCELLED");
      results.push({
        num, date, eventName, campoutLocation: rawCampout, breakfastLocation: rawBreakfast,
        cancelled, notes, campoutGeo: null, breakfastGeo: null,
        campoutDistMi: null, breakfastDistMi: null, campoutToBreakfastDistMi: null,
        campoutDurMin: null, breakfastDurMin: null, campoutToBreakfastDurMin: null,
      });
      continue;
    }

    // Geocode campout
    let campoutGeo: GeoResult | null = null;
    if (cleanedCampout) {
      geocodeTotal++;
      campoutGeo = await geocode(cleanedCampout);
      if (campoutGeo) {
        geocodeSuccess++;
        console.log(`  Camp: ✓ ${cleanedCampout} → ${campoutGeo.displayName} (${campoutGeo.lat}, ${campoutGeo.lng})`);
      } else {
        console.log(`  Camp: ✗ "${cleanedCampout}"`);
        failures.push({ num, field: "campout", raw: rawCampout, cleaned: cleanedCampout });
      }
    } else {
      console.log(`  Camp: (empty)`);
      if (rawCampout) failures.push({ num, field: "campout", raw: rawCampout, cleaned: "" });
    }

    // Geocode breakfast
    let breakfastGeo: GeoResult | null = null;
    if (cleanedBreakfast) {
      geocodeTotal++;
      breakfastGeo = await geocode(cleanedBreakfast);
      if (breakfastGeo) {
        geocodeSuccess++;
        console.log(`  Bkfst: ✓ ${cleanedBreakfast.substring(0, 60)} → (${breakfastGeo.lat}, ${breakfastGeo.lng})`);
      } else {
        console.log(`  Bkfst: ✗ "${cleanedBreakfast.substring(0, 80)}"`);
        failures.push({ num, field: "breakfast", raw: rawBreakfast, cleaned: cleanedBreakfast });
      }
    }

    // Calculate driving distances via OSRM
    let campoutDistMi: number | null = null;
    let campoutDurMin: number | null = null;
    let breakfastDistMi: number | null = null;
    let breakfastDurMin: number | null = null;
    let c2bDistMi: number | null = null;
    let c2bDurMin: number | null = null;

    if (campoutGeo) {
      const route = await drivingDistMi(SAN_LEANDRO.lat, SAN_LEANDRO.lng, campoutGeo.lat, campoutGeo.lng);
      if (route) {
        campoutDistMi = route.distMi;
        campoutDurMin = route.durationMin;
        console.log(`  → SL to camp: ${route.distMi} mi, ${route.durationMin} min`);
      } else {
        // Fallback to haversine
        campoutDistMi = Math.round(haversineDistMi(SAN_LEANDRO.lat, SAN_LEANDRO.lng, campoutGeo.lat, campoutGeo.lng));
        console.log(`  → SL to camp: ~${campoutDistMi} mi (straight line, no route found)`);
      }
    }

    if (breakfastGeo) {
      const route = await drivingDistMi(SAN_LEANDRO.lat, SAN_LEANDRO.lng, breakfastGeo.lat, breakfastGeo.lng);
      if (route) {
        breakfastDistMi = route.distMi;
        breakfastDurMin = route.durationMin;
      }
    }

    if (campoutGeo && breakfastGeo) {
      const route = await drivingDistMi(breakfastGeo.lat, breakfastGeo.lng, campoutGeo.lat, campoutGeo.lng);
      if (route) {
        c2bDistMi = route.distMi;
        c2bDurMin = route.durationMin;
      }
    }

    results.push({
      num, date, eventName, campoutLocation: rawCampout, breakfastLocation: rawBreakfast,
      cancelled, notes, campoutGeo, breakfastGeo,
      campoutDistMi, breakfastDistMi, campoutToBreakfastDistMi: c2bDistMi,
      campoutDurMin, breakfastDurMin, campoutToBreakfastDurMin: c2bDurMin,
    });
  }

  // Save full results
  writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));

  console.log(`\n\n========== SUMMARY ==========`);
  console.log(`Total records: ${dataRows.length}`);
  console.log(`Geocode attempts: ${geocodeTotal}`);
  console.log(`Successfully geocoded: ${geocodeSuccess} (${Math.round(geocodeSuccess / geocodeTotal * 100)}%)`);

  if (failures.length > 0) {
    console.log(`\n========== NEEDS ATTENTION (${failures.length}) ==========`);
    for (const f of failures) {
      console.log(`  #${f.num} [${f.field}]: cleaned="${f.cleaned}" | raw="${f.raw.substring(0, 80)}${f.raw.length > 80 ? '...' : ''}"`);
    }
  }

  // Generate distance CSV
  const summaryLines = [
    "Num,Date,Event Name,Campout Location (cleaned),Campout Lat,Campout Lng,Breakfast Location (cleaned),Breakfast Lat,Breakfast Lng,SL to Camp (mi),SL to Camp (min),SL to Bkfst (mi),SL to Bkfst (min),Bkfst to Camp (mi),Bkfst to Camp (min),Cancelled",
  ];
  for (const r of results) {
    const cName = r.campoutGeo?.displayName ?? "";
    const bName = r.breakfastGeo?.displayName ?? "";
    const fields = [
      r.num, r.date,
      `"${r.eventName.replace(/"/g, '""')}"`,
      `"${cName.replace(/"/g, '""')}"`,
      r.campoutGeo?.lat ?? "", r.campoutGeo?.lng ?? "",
      `"${bName.replace(/"/g, '""')}"`,
      r.breakfastGeo?.lat ?? "", r.breakfastGeo?.lng ?? "",
      r.campoutDistMi ?? "", r.campoutDurMin ?? "",
      r.breakfastDistMi ?? "", r.breakfastDurMin ?? "",
      r.campoutToBreakfastDistMi ?? "", r.campoutToBreakfastDurMin ?? "",
      r.cancelled ? "YES" : "",
    ];
    summaryLines.push(fields.join(","));
  }
  writeFileSync(join(__dirname, "campouts-distances.csv"), summaryLines.join("\n"));
  console.log(`\nOutput: ${OUTPUT_PATH}`);
  console.log(`CSV: ${join(__dirname, "campouts-distances.csv")}`);
}

main().catch(console.error);
