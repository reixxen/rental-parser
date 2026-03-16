import { convex } from "@/lib/convex-client";
import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { NonRetriableError } from "inngest";
import { z } from "zod";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { inngest, PROCESS_LISTING_EVENT } from "./client";

interface ListingProcessingEvent {
  listingId: Id<"listings">;
}

const addressComponentSchema = z.object({
  long_name: z.string(),
  short_name: z.string(),
  types: z.array(z.string()),
});

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const geometrySchema = z.object({
  location: locationSchema,
  location_type: z.string(),
  viewport: z.object({
    northeast: locationSchema,
    southwest: locationSchema,
  }),
});

const geocodeResponseSchema = z.object({
  results: z
    .array(
      z.object({
        address_components: z.array(addressComponentSchema),
        formatted_address: z.string(),
        geometry: geometrySchema,
        place_id: z.string(),
        types: z.array(z.string()),
      })
    )
    .min(1),
  status: z.literal("OK"),
});

export const processListing = inngest.createFunction(
  {
    id: "process-listing",
    concurrency: 1,
    throttle: {
      limit: 1,
      period: "1m",
    },
    onFailure: async ({ event, step }) => {
      const { listingId } = event.data.event.data as ListingProcessingEvent;

      await step.run("set-error-status", async () => {
        return convex.mutation(api.listings.updateStatus, {
          id: listingId,
          status: "error",
        });
      });
    },
  },
  { event: PROCESS_LISTING_EVENT },
  async ({ event, step }) => {
    const { listingId } = event.data as ListingProcessingEvent;

    const listing = await step.run("get-listing", async () => {
      return await convex.query(api.listings.getById, {
        id: listingId,
      });
    });

    if (!listing) {
      throw new NonRetriableError(`Listing not found: ${listingId}`);
    }

    await step.run("set-processing-status", async () => {
      return convex.mutation(api.listings.updateStatus, {
        id: listingId,
        status: "processing",
      });
    });

    const rentalInfo = await step.run("generate-rental-info", async () => {
      const response = await generateText({
        model: google("gemini-flash-lite-latest"),
        output: Output.object({
          schema: z.object({
            address: z.string().describe("Улица и номер дома."),
            rent: z
              .number()
              .describe("Стоимость аренды в месяц. Если не указана, верни 0."),
            deposit: z
              .number()
              .describe("Сумма залога. Если не указан, верни 0."),
            commission: z
              .number()
              .describe("Сумма комиссии. Если не указана, верни 0."),
            totalArea: z
              .number()
              .describe("Общая площадь. Если не указана, верни -1."),
            floor: z.number().describe("Этаж. Если не указан, верни -1."),
            totalFloor: z
              .number()
              .describe("Общее количество этажей. Если не указано, верни -1."),
            rooms: z
              .number()
              .describe(
                "Количество комнат. Студия = 0. Если не указано, верни -1."
              ),
            bills: z.object({
              metered: z
                .union([z.literal("tenant"), z.literal("owner")])
                .describe(
                  "Кто платит счётчики (свет, вода, газ). tenant = жилец платит отдельно по счётчикам, owner = включено в аренду."
                ),
              fixed: z
                .union([z.literal("tenant"), z.literal("owner")])
                .describe(
                  "Кто платит фиксированные ЖКУ (отопление, мусор, содержание дома). tenant = жилец платит отдельно, owner = включено в аренду."
                ),
              fixedAmount: z
                .number()
                .describe(
                  "Фиксированная сумма ЖКУ в месяц, если явно указана в объявлении. Если не указано, то 0."
                ),
            }),
            description: z
              .string()
              .describe(
                "Описание объявления. Удали хэштеги, ссылки ВК типа [id123|Имя] и имена авторов. Оставь только суть: описание квартиры, условия и контакты."
              ),
          }),
        }),
        system: `Ты парсер объявлений об аренде жилья в Магнитогорске. 
        Извлекай только то, что явно указано в тексте — не придумывай и не угадывай. 
        Текст может быть написан небрежно, с опечатками и сокращениями (тр = тысяч рублей, к/у = коммунальные услуги).
        Отвечай строго в указанном формате.`,
        temperature: 0,
        prompt: `Извлеки данные из объявления об аренде:\n\n${listing.text}`,
      });

      return response.output;
    });

    const geoResponse = await step.fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?key=${
        process.env.GOOGLE_MAPS_API_KEY
      }&address=${encodeURIComponent(rentalInfo.address + ", Магнитогорск")}&components=country:RU&language=ru`
    );

    const geocodeResult = await step.run("parse-geo-response", async () => {
      const data = await geoResponse.json();
      const result = geocodeResponseSchema.safeParse(data);
      if (!result.success) return null;
      return result.data.results[0];
    });

    const {
      geometry = { location: { lat: 0, lng: 0 } },
      address_components: addressComponents = [],
      formatted_address: formattedAddress = "",
    } = geocodeResult ?? {};

    const city =
      addressComponents.find((c) => c.types.includes("locality"))?.long_name ??
      "";

    const parts = formattedAddress.split(",").map((p) => p.trim());
    const cityIndex = parts.indexOf(city);
    const cleanAddress =
      cityIndex > 0 ? parts.slice(0, cityIndex).join(", ") : parts[0];

    let district = "";
    if (city === "Магнитогорск") {
      if (geometry.location.lat > 53.4245) district = "Ленинский";
      else if (geometry.location.lat > 53.389) district = "Правобережный";
      else district = "Орджоникидзевский";
    }

    const rentalId = await step.run("create-rental", async () => {
      const {
        bills,
        commission,
        deposit,
        description,
        floor,
        rent,
        rooms,
        totalArea,
        totalFloor,
      } = rentalInfo;

      return await convex.mutation(api.rentals.create, {
        listingId,
        totalArea: totalArea === -1 ? undefined : totalArea,
        floor: floor === -1 ? undefined : floor,
        totalFloor: totalFloor === -1 ? undefined : totalFloor,
        rooms: rooms === -1 ? undefined : rooms,
        rent: rent,
        deposit: deposit,
        commission: commission,
        bills: bills,
        description: description,
        location: {
          address: cleanAddress,
          city: city,
          district: district,
          lat: geometry.location.lat,
          lng: geometry.location.lng,
        },
      });
    });

    await step.run("set-processed-status", async () => {
      return convex.mutation(api.listings.updateStatus, {
        id: listingId,
        status: "processed",
      });
    });

    return { success: true, rentalId };
  }
);
