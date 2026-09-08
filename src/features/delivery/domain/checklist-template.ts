import type { DeliveryTaskCategory } from "./delivery";

export const deliveryChecklistTemplate: ReadonlyArray<{
  category: DeliveryTaskCategory;
  titles: readonly string[];
}> = [
  {
    "category": "Trainer",
    "titles": [
      "Confirm trainer",
      "Briefing with trainer"
    ]
  },
  {
    "category": "Certificate",
    "titles": [
      "Design",
      "Printing",
      "Plastic cover / frame",
      "Collect trainer and authorized signatory signatures"
    ]
  },
  {
    "category": "Venue",
    "titles": [
      "Confirm booking",
      "Check sound, lighting, and arrangements",
      "Food",
      "Refreshments",
      "Flipchart and markers",
      "LCD and laptop",
      "T-stand",
      "Check training room"
    ]
  },
  {
    "category": "Training Materials",
    "titles": [
      "Soft copy",
      "Design book cover",
      "Print books",
      "Games",
      "Gifts"
    ]
  },
  {
    "category": "Attendance List",
    "titles": [
      "Prepare attendance list"
    ]
  },
  {
    "category": "Banner and Backdrop",
    "titles": [
      "Banner design",
      "Banner printing",
      "Backdrop design"
    ]
  },
  {
    "category": "Reception",
    "titles": [
      "Customer relations"
    ]
  },
  {
    "category": "Speech",
    "titles": [
      "Confirm speaker",
      "Trainer speech"
    ]
  },
  {
    "category": "Certificate Distribution",
    "titles": [
      "Distribute certificates"
    ]
  },
  {
    "category": "Training Evaluation",
    "titles": [
      "Pre-training assessment: design",
      "Pre-training assessment: distribution",
      "Pre-training assessment: share with trainer and employer",
      "Post-training assessment: design",
      "Post-training assessment: distribution",
      "Post-training assessment: share with trainer and employer"
    ]
  },
  {
    "category": "Photo and Video",
    "titles": [
      "Arrange photography and video coverage"
    ]
  },
  {
    "category": "Follow-up and Customer Relations",
    "titles": [
      "Set follow-up date",
      "Confirm with trainer",
      "Confirm with employer",
      "Confirm venue",
      "Set up Telegram group",
      "Share best practices"
    ]
  },
  {
    "category": "Report Writing after Training",
    "titles": [
      "Write training report and enter in system"
    ]
  }
];
