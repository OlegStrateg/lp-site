export const FEEDS = [
  ['vogue_rss','Vogue','US','trendsetter','https://www.vogue.com/feed/rss'],
  ['gq_rss','GQ','US','trendsetter','https://www.gq.com/feed/rss'],
  ['teen_vogue_rss','Teen Vogue','US','early_adopter','https://www.teenvogue.com/feed/rss'],
  ['who_what_wear_rss','Who What Wear','US','early_adopter','https://www.whowhatwear.com/feeds.xml'],
  ['harpers_bazaar_rss',"Harper's Bazaar",'US','trendsetter','https://www.harpersbazaar.com/rss/fashion.xml'],
  ['elle_rss','ELLE','US','trendsetter','https://www.elle.com/rss/fashion.xml'],
  ['wwd_rss','WWD','US','trendsetter','https://wwd.com/fashion-news/feed'],
  ['guardian_fashion_rss','The Guardian Fashion','GB','early_adopter','https://www.theguardian.com/fashion/rss'],
  ['fashionista_rss','Fashionista','US','early_adopter','https://fashionista.com/.rss/excerpt/'],
  ['refinery29_rss','Refinery29','US','early_adopter','https://www.refinery29.com/fashion/rss.xml'],
  ['hypebeast_rss','Hypebeast','GLOBAL','trendsetter','https://hypebeast.com/fashion/feed'],
  ['dazed_rss','Dazed','GB','trendsetter','https://www.dazeddigital.com/rss']
];

export const RULES = [
  {id:'peplum',family:'construction_detail',label:'Peplum / баска',terms:['peplum','peplum top','баска','топ с баской']},
  {id:'polka_dot',family:'print_pattern',label:'Polka dot / горох',terms:['polka dot','polka-dot','polka dots','в горох','горошек']},
  {id:'color_clash_sheer_layering',family:'styling_combination',label:'Color clash + sheer layering',terms:['color clash','colour clash','color-clashing','sheer overlay','sheer layering','прозрачные слои','контрастная многослойность']},
  {id:'mary_jane',family:'footwear_shape_details',label:'Mary Jane',terms:['mary jane','mary-janes','мэри джейн','туфли мэри джейн']},
  {id:'bubble_skirt',family:'silhouette',label:'Bubble skirt / юбка-баллон',terms:['bubble skirt','puffball skirt','balloon skirt','юбка баллон','юбка-баллон']},
  {id:'capri_pants',family:'length',label:'Capri pants / капри',terms:['capri pants','capri trousers','капри','брюки капри']}
];

export const VOGUE_YOUTUBE = 'https://www.youtube.com/feeds/videos.xml?channel_id=UCRXiA3h1no_PFkb1JCP0yMA';
export function googleTrendsUrl(geo) {
  return 'https://trends.google.com/trending/rss?geo=' + encodeURIComponent(geo);
}
