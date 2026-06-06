/**
 * AI Vendor Recommendation — weighted scoring on price, delivery, and rating.
 * Weights: Price 40%, Delivery 30%, Rating 30%
 */
export function recommendVendor(quotations) {
  if (!quotations?.length) return null;

  const prices = quotations.map((q) => Number(q.total_price));
  const deliveries = quotations.map((q) => Number(q.delivery_days));
  const ratings = quotations.map((q) => Number(q.vendor_rating) || 0);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDelivery = Math.min(...deliveries);
  const maxDelivery = Math.max(...deliveries);
  const minRating = Math.min(...ratings);
  const maxRating = Math.max(...ratings);

  const scored = quotations.map((q) => {
    const price = Number(q.total_price);
    const delivery = Number(q.delivery_days);
    const rating = Number(q.vendor_rating) || 0;

    const priceScore = maxPrice === minPrice ? 1 : (maxPrice - price) / (maxPrice - minPrice);
    const deliveryScore = maxDelivery === minDelivery ? 1 : (maxDelivery - delivery) / (maxDelivery - minDelivery);
    const ratingScore = maxRating === minRating ? 1 : (rating - minRating) / (maxRating - minRating);
    const aiScore = Math.round((priceScore * 0.4 + deliveryScore * 0.3 + ratingScore * 0.3) * 100);

    const reasons = [];
    if (price === minPrice) reasons.push("Lowest price");
    if (delivery === minDelivery) reasons.push("Fastest delivery");
    if (rating === maxRating && rating > 0) reasons.push("Highest vendor rating");
    if (aiScore >= 80) reasons.push("Best overall value");

    return {
      quotationId: q.id,
      vendorName: q.vendor_name,
      vendorId: q.vendor_id,
      totalPrice: price,
      deliveryDays: delivery,
      rating,
      aiScore,
      reasons: reasons.length ? reasons : ["Balanced score across all factors"],
    };
  });

  scored.sort((a, b) => b.aiScore - a.aiScore);
  return {
    recommended: scored[0],
    rankings: scored,
    algorithm: "Weighted scoring: Price 40%, Delivery 30%, Rating 30%",
  };
}
