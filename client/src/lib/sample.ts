export const SAMPLE_BUBBLE = {
  type: "bubble",
  hero: {
    type: "image",
    url: "https://scdn.line-apps.com/n/channel_devcenter/img/fx/01_2_restaurant.png",
    size: "full",
    aspectRatio: "20:13",
    aspectMode: "cover",
  },
  body: {
    type: "box",
    layout: "vertical",
    contents: [
      { type: "text", text: "Brown Cafe", weight: "bold", size: "xl" },
      {
        type: "box",
        layout: "baseline",
        margin: "md",
        contents: [
          { type: "icon", size: "sm", url: "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png" },
          { type: "icon", size: "sm", url: "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png" },
          { type: "icon", size: "sm", url: "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png" },
          { type: "icon", size: "sm", url: "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gold_star_28.png" },
          { type: "icon", size: "sm", url: "https://scdn.line-apps.com/n/channel_devcenter/img/fx/review_gray_star_28.png" },
          { type: "text", text: "4.0", size: "sm", color: "#999999", margin: "md", flex: 0 },
        ],
      },
      {
        type: "box",
        layout: "vertical",
        margin: "lg",
        spacing: "sm",
        contents: [
          {
            type: "box",
            layout: "baseline",
            spacing: "sm",
            contents: [
              { type: "text", text: "Place", color: "#aaaaaa", size: "sm", flex: 1 },
              { type: "text", text: "東京都渋谷区神南1-2-3", wrap: true, color: "#666666", size: "sm", flex: 5 },
            ],
          },
          {
            type: "box",
            layout: "baseline",
            spacing: "sm",
            contents: [
              { type: "text", text: "Time", color: "#aaaaaa", size: "sm", flex: 1 },
              { type: "text", text: "10:00 - 23:00", wrap: true, color: "#666666", size: "sm", flex: 5 },
            ],
          },
        ],
      },
    ],
  },
  footer: {
    type: "box",
    layout: "vertical",
    spacing: "sm",
    contents: [
      {
        type: "button",
        style: "primary",
        height: "sm",
        action: { type: "uri", label: "予約する", uri: "https://example.com" },
      },
      {
        type: "button",
        style: "link",
        height: "sm",
        action: { type: "uri", label: "ウェブサイト", uri: "https://example.com" },
      },
    ],
  },
};

export const SAMPLE_JSON = JSON.stringify(SAMPLE_BUBBLE, null, 2);
