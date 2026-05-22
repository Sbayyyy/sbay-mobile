import { fireEvent, render } from "@testing-library/react-native";

import { OfferMessageCard } from "../OfferMessageCard";
import { LightTheme } from "@/constants/theme";
import { type Message, type OfferMessageData } from "@/services/messages";

jest.mock("@/hooks/use-app-theme", () => ({
  useAppTheme: () => LightTheme.colors,
}));

const message: Message = {
  id: "message-1",
  chatId: "chat-1",
  senderId: "buyer-1",
  receiverId: "seller-1",
  listingId: "listing-1",
  content: "Offer: 100 SYP",
  type: "offer",
  dataJson: null,
  createdAt: "2026-01-01T00:00:00Z",
  isRead: false,
};

const offer: OfferMessageData = {
  offerId: "offer-1",
  listingId: "listing-1",
  amount: 100,
  currency: "SYP",
  status: "pending",
};

describe("OfferMessageCard", () => {
  it("renders seller offer actions and dispatches selected actions", () => {
    const onAccept = jest.fn();
    const onReject = jest.fn();
    const onCounter = jest.fn();

    const { getByLabelText, getByText } = render(
      <OfferMessageCard
        offer={offer}
        message={message}
        canAcceptReject
        canCounter
        busy={false}
        onAccept={onAccept}
        onReject={onReject}
        onCounter={onCounter}
      />,
    );

    expect(getByText("Offer")).toBeTruthy();
    expect(getByText("Pending")).toBeTruthy();
    fireEvent.press(getByLabelText("Accept offer"));
    fireEvent.press(getByLabelText("Reject offer"));
    fireEvent.press(getByLabelText("Counter offer"));

    expect(onAccept).toHaveBeenCalledWith(message);
    expect(onReject).toHaveBeenCalledWith(message);
    expect(onCounter).toHaveBeenCalledWith(message);
  });

  it("hides accept and reject when only counter is allowed", () => {
    const { queryByLabelText, getByLabelText } = render(
      <OfferMessageCard
        offer={offer}
        message={message}
        canAcceptReject={false}
        canCounter
        busy={false}
        onAccept={jest.fn()}
        onReject={jest.fn()}
        onCounter={jest.fn()}
      />,
    );

    expect(queryByLabelText("Accept offer")).toBeNull();
    expect(queryByLabelText("Reject offer")).toBeNull();
    expect(getByLabelText("Counter offer")).toBeTruthy();
  });
});
