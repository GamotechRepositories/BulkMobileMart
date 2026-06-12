import { useCallback, useEffect, useMemo, useState } from "react";

import { getAdminOrders } from "../../../api/api";

import { useAuth } from "../../../context/AuthContext";

import AdminAlert from "../AdminAlert";

import {

  adminCompactTableClass,

  adminCompactTdClass,

  adminCompactThClass,

  adminTableHeaderClass,

  adminTableWrapperClass,

} from "../adminStyles";

import AdminOrderFilters from "./AdminOrderFilters";

import {

  downloadPaymentsCsv,

  formatDate,

  formatPrice,

  getCustomerName,

  getCustomerPhone,

  getOrderDisplayId,

  getPaymentMethodLabel,

  getPaymentStatus,

  getPaymentStatusBadgeClass,

  getProductSummary,

  getTransactionId,

} from "./adminOrderUtils";



function getErrorMessage(err, fallback) {

  return err.response?.data?.message || err.message || fallback;

}



function PaymentSection() {

  const { adminUser } = useAuth();

  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  const [startDate, setStartDate] = useState("");

  const [endDate, setEndDate] = useState("");

  const [orderStatus, setOrderStatus] = useState("all");

  const [paymentStatus, setPaymentStatus] = useState("all");



  const fetchOrders = useCallback(async () => {

    if (adminUser?.role !== "admin") return;



    try {

      setLoading(true);

      setError("");

      const params = {};

      if (startDate) params.startDate = startDate;

      if (endDate) params.endDate = endDate;

      if (orderStatus !== "all") params.status = orderStatus;

      if (paymentStatus !== "all") params.paymentStatus = paymentStatus;



      const { data } = await getAdminOrders(params);

      setOrders(data.data || []);

    } catch (err) {

      setError(getErrorMessage(err, "Failed to load payments"));

      setOrders([]);

    } finally {

      setLoading(false);

    }

  }, [adminUser, startDate, endDate, orderStatus, paymentStatus]);



  useEffect(() => {

    fetchOrders();

  }, [fetchOrders]);



  const sortedOrders = useMemo(

    () =>

      [...orders].sort(

        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()

      ),

    [orders]

  );



  return (

    <div className="min-w-0">

      <AdminAlert

        error={error}

        success={success}

        onClear={() => {

          setError("");

          setSuccess("");

        }}

      />



      <p className="mb-4 text-sm font-medium text-neutral-700">

        {sortedOrders.length} payment record{sortedOrders.length === 1 ? "" : "s"}

      </p>



      <AdminOrderFilters

        startDate={startDate}

        endDate={endDate}

        orderStatus={orderStatus}

        paymentStatus={paymentStatus}

        onStartDateChange={setStartDate}

        onEndDateChange={setEndDate}

        onOrderStatusChange={setOrderStatus}

        onPaymentStatusChange={setPaymentStatus}

        onDownload={() => downloadPaymentsCsv(sortedOrders, "payments.csv")}

      />



      {loading ? (

        <p className="mt-4 text-text-secondary">Loading payments...</p>

      ) : sortedOrders.length === 0 ? (

        <p className="mt-4 text-text-secondary">No payment records found.</p>

      ) : (

        <div className={adminTableWrapperClass}>

          <table className={adminCompactTableClass}>

            <colgroup>

              <col className="w-[8%]" />

              <col className="w-[13%]" />

              <col className="w-[18%]" />

              <col className="w-[8%]" />

              <col className="w-[8%]" />

              <col className="w-[8%]" />

              <col className="w-[20%]" />

              <col className="w-[9%]" />

            </colgroup>

            <thead>

              <tr className={adminTableHeaderClass}>

                <th className={adminCompactThClass}>Order ID</th>

                <th className={adminCompactThClass}>Customer</th>

                <th className={adminCompactThClass}>Products</th>

                <th className={adminCompactThClass}>Amount</th>

                <th className={adminCompactThClass}>Method</th>

                <th className={adminCompactThClass}>Payment</th>

                <th className={adminCompactThClass}>Transaction ID</th>

                <th className={adminCompactThClass}>Date</th>

              </tr>

            </thead>

            <tbody>

              {sortedOrders.map((order) => {

                const payment = getPaymentStatus(order);

                const transactionId = getTransactionId(order);



                return (

                  <tr

                    key={order._id}

                    className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50"

                  >

                    <td className={`${adminCompactTdClass} font-semibold text-neutral-900`}>

                      <span className="block truncate">{getOrderDisplayId(order)}</span>

                    </td>

                    <td className={adminCompactTdClass}>

                      <p className="truncate font-medium text-neutral-900">

                        {getCustomerName(order)}

                      </p>

                      <p className="mt-0.5 truncate text-[10px] text-neutral-500">

                        {getCustomerPhone(order)}

                      </p>

                    </td>

                    <td className={`${adminCompactTdClass} text-neutral-600`}>

                      <span className="line-clamp-2 break-words">{getProductSummary(order)}</span>

                    </td>

                    <td className={`${adminCompactTdClass} font-semibold text-neutral-900`}>

                      <span className="block truncate">{formatPrice(order.total)}</span>

                    </td>

                    <td className={`${adminCompactTdClass} text-neutral-600`}>

                      <span className="block truncate">{getPaymentMethodLabel(order)}</span>

                    </td>

                    <td className={adminCompactTdClass}>

                      <span

                        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium lowercase ${getPaymentStatusBadgeClass(payment)}`}

                      >

                        {payment}

                      </span>

                    </td>

                    <td className={`${adminCompactTdClass} text-neutral-600`}>

                      <span className="line-clamp-2 break-all">

                        {transactionId || "—"}

                      </span>

                    </td>

                    <td className={`${adminCompactTdClass} text-neutral-600`}>

                      <span className="block truncate">{formatDate(order.createdAt)}</span>

                    </td>

                  </tr>

                );

              })}

            </tbody>

          </table>

        </div>

      )}

    </div>

  );

}



export default PaymentSection;

