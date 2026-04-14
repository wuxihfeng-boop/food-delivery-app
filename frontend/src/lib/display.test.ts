import {
  getAllowedMerchantOrderStatuses,
  getOrderStatusLabel,
  translateErrorMessage,
} from "@/lib/display";


describe("getAllowedMerchantOrderStatuses", () => {
  it("keeps the current status and only exposes valid next states", () => {
    expect(getAllowedMerchantOrderStatuses("pending")).toEqual(["pending", "confirmed", "cancelled"]);
    expect(getAllowedMerchantOrderStatuses("confirmed")).toEqual(["confirmed", "preparing", "cancelled"]);
    expect(getAllowedMerchantOrderStatuses("preparing")).toEqual(["preparing", "completed"]);
  });

  it("treats completed and cancelled as terminal states", () => {
    expect(getAllowedMerchantOrderStatuses("completed")).toEqual(["completed"]);
    expect(getAllowedMerchantOrderStatuses("cancelled")).toEqual(["cancelled"]);
  });
});

describe("translateErrorMessage", () => {
  it("maps important backend errors to localized copy", () => {
    expect(translateErrorMessage("Email already registered")).toBe("该邮箱已被注册。");
    expect(translateErrorMessage("Cart contains unavailable menu items")).toBe(
      "购物车中包含已下架或不可售商品，请先调整后再下单。",
    );
    expect(translateErrorMessage("Invalid order status transition: pending -> completed")).toBe(
      "当前订单状态不允许这样流转。",
    );
  });

  it("falls back to the original message when no mapping exists", () => {
    expect(translateErrorMessage("Custom message")).toBe("Custom message");
  });
});

describe("getOrderStatusLabel", () => {
  it("returns labels for every supported order status", () => {
    expect(getOrderStatusLabel("pending")).toBe("待处理");
    expect(getOrderStatusLabel("confirmed")).toBe("已确认");
    expect(getOrderStatusLabel("preparing")).toBe("制作中");
    expect(getOrderStatusLabel("completed")).toBe("已完成");
    expect(getOrderStatusLabel("cancelled")).toBe("已取消");
  });
});
